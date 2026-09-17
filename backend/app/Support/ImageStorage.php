<?php

namespace App\Support;

use App\Models\UploadedImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Stores uploaded pictures in the database instead of the local disk.
 *
 * On ephemeral hosts (Render free plan, Fly, Heroku, ...) the container
 * filesystem is rebuilt on every deploy and every wake-up from sleep, so
 * anything written to storage/app/public disappears while the database row
 * still points at it. Keeping the bytes in the database makes pictures live
 * exactly as long as the menu item they belong to.
 *
 * A stored picture is referenced as "db:{id}". Plain http(s) URLs and legacy
 * "menu_items/xxx.jpg" disk paths are still understood so old rows keep working.
 */
class ImageStorage
{
    /** Reference prefix for database backed pictures. */
    public const PREFIX = 'db:';

    /** Longest edge kept after downscaling, in pixels. */
    private const MAX_DIMENSION = 1200;

    /** Files at or below this size with sane dimensions are stored untouched. */
    private const KEEP_ORIGINAL_BYTES = 307200; // 300 KB

    private const JPEG_QUALITY = 82;

    /**
     * Persist an uploaded file and return its reference string ("db:12").
     */
    public static function store(UploadedFile $file): string
    {
        [$bytes, $mime, $filename] = self::optimize($file);

        $image = UploadedImage::create([
            'filename' => $filename,
            'mime_type' => $mime,
            'byte_size' => strlen($bytes),
            'data' => base64_encode($bytes),
        ]);

        return self::PREFIX . $image->id;
    }

    /**
     * Remove a previously stored picture. Safe to call with any reference type;
     * remote URLs are left alone and legacy disk paths are unlinked as before.
     */
    public static function delete(?string $reference): void
    {
        if (empty($reference)) {
            return;
        }

        if (self::isDatabaseReference($reference)) {
            UploadedImage::whereKey(self::idFromReference($reference))->delete();

            return;
        }

        if (!str_starts_with($reference, 'http')) {
            Storage::disk('public')->delete($reference);
        }
    }

    /**
     * Turn a stored reference into a URL the browser can load.
     */
    public static function url(?string $reference): ?string
    {
        if (empty($reference)) {
            return null;
        }

        if (self::isDatabaseReference($reference)) {
            return url('/api/images/' . self::idFromReference($reference));
        }

        if (str_starts_with($reference, 'http')) {
            return $reference;
        }

        return asset('storage/' . $reference);
    }

    /**
     * Collapse a value coming back from the client into its canonical stored
     * form. The admin form resends the resolved URL when the picture is left
     * unchanged, so without this the row would drift to an absolute URL baked
     * against the current APP_URL and break the next time the domain changes.
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        if (self::isDatabaseReference($value)) {
            return $value;
        }

        if (preg_match('#/api/images/(\d+)/*$#', $value, $matches) === 1) {
            return self::PREFIX . $matches[1];
        }

        if (preg_match('#^https?://[^/]+/storage/(.+)$#', $value, $matches) === 1) {
            return $matches[1];
        }

        return $value;
    }

    public static function isDatabaseReference(?string $reference): bool
    {
        return is_string($reference) && str_starts_with($reference, self::PREFIX);
    }

    public static function idFromReference(string $reference): int
    {
        return (int) substr($reference, strlen(self::PREFIX));
    }

    /**
     * Downscale and re-encode so a 6 MB phone photo does not become a 8 MB
     * database row. Falls back to the original bytes whenever GD cannot handle
     * the format (webp/avif builds without the matching libraries) or when
     * re-encoding would not actually save anything.
     *
     * @return array{0: string, 1: string, 2: string} [bytes, mime type, filename]
     */
    private static function optimize(UploadedFile $file): array
    {
        $raw = @file_get_contents($file->getRealPath());
        $originalName = $file->getClientOriginalName() ?: 'upload';
        $mime = $file->getMimeType() ?: 'application/octet-stream';

        if ($raw === false || $raw === '') {
            return ['', $mime, $originalName];
        }

        $fallback = [$raw, $mime, $originalName];

        if (!function_exists('imagecreatefromstring') || !function_exists('imagecopyresampled')) {
            return $fallback;
        }

        $info = @getimagesizefromstring($raw);
        if ($info === false) {
            return $fallback;
        }

        [$width, $height] = $info;
        if ($width < 1 || $height < 1) {
            return $fallback;
        }

        $withinBounds = $width <= self::MAX_DIMENSION && $height <= self::MAX_DIMENSION;
        if ($withinBounds && strlen($raw) <= self::KEEP_ORIGINAL_BYTES) {
            return $fallback;
        }

        try {
            $source = @imagecreatefromstring($raw);
            if ($source === false) {
                return $fallback;
            }

            $isPng = ($info[2] ?? null) === IMAGETYPE_PNG;

            if (!$isPng) {
                $source = self::applyExifOrientation($source, $file->getRealPath());
                $width = imagesx($source);
                $height = imagesy($source);
            }

            $ratio = min(self::MAX_DIMENSION / $width, self::MAX_DIMENSION / $height, 1);
            $targetWidth = max(1, (int) round($width * $ratio));
            $targetHeight = max(1, (int) round($height * $ratio));

            $canvas = imagecreatetruecolor($targetWidth, $targetHeight);

            if ($isPng) {
                imagealphablending($canvas, false);
                imagesavealpha($canvas, true);
                $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
                imagefilledrectangle($canvas, 0, 0, $targetWidth, $targetHeight, $transparent);
            } else {
                $white = imagecolorallocate($canvas, 255, 255, 255);
                imagefilledrectangle($canvas, 0, 0, $targetWidth, $targetHeight, $white);
            }

            imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

            ob_start();
            if ($isPng) {
                imagepng($canvas, null, 6);
                $outputMime = 'image/png';
                $extension = 'png';
            } else {
                imagejpeg($canvas, null, self::JPEG_QUALITY);
                $outputMime = 'image/jpeg';
                $extension = 'jpg';
            }
            $encoded = ob_get_clean();

            imagedestroy($canvas);
            imagedestroy($source);

            if (!is_string($encoded) || $encoded === '' || strlen($encoded) >= strlen($raw)) {
                return $fallback;
            }

            $basename = pathinfo($originalName, PATHINFO_FILENAME) ?: 'upload';

            return [$encoded, $outputMime, $basename . '.' . $extension];
        } catch (\Throwable $e) {
            Log::warning('Image optimisation failed, storing original bytes: ' . $e->getMessage());

            return $fallback;
        }
    }

    /**
     * Rotate photos taken sideways on a phone so they are stored upright.
     *
     * @param  \GdImage  $source
     * @return \GdImage
     */
    private static function applyExifOrientation($source, string $path)
    {
        if (!function_exists('exif_read_data') || !function_exists('imagerotate')) {
            return $source;
        }

        $exif = @exif_read_data($path);
        $orientation = is_array($exif) ? ($exif['Orientation'] ?? 1) : 1;

        $degrees = match ((int) $orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        if ($degrees === 0) {
            return $source;
        }

        $rotated = @imagerotate($source, $degrees, 0);
        if ($rotated === false) {
            return $source;
        }

        imagedestroy($source);

        return $rotated;
    }
}
