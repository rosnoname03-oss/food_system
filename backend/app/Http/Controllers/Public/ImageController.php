<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\UploadedImage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ImageController extends Controller
{
    /**
     * Serve an uploaded picture stored in the database.
     *
     * Rows are immutable once written (replacing a picture creates a new row),
     * so the response can be cached aggressively by the browser and any CDN.
     */
    public function show(Request $request, int $id): Response
    {
        $meta = UploadedImage::select(['id', 'byte_size', 'mime_type'])->find($id);

        if (!$meta) {
            abort(404);
        }

        $etag = '"img-' . $meta->id . '-' . $meta->byte_size . '"';

        $headers = [
            'Content-Type' => $meta->mime_type ?: 'image/jpeg',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'ETag' => $etag,
            'Access-Control-Allow-Origin' => '*',
        ];

        if (trim((string) $request->header('If-None-Match')) === $etag) {
            return response('', 304, $headers);
        }

        $image = UploadedImage::select(['id', 'data'])->find($id);
        $bytes = base64_decode($image->data, true);

        if ($bytes === false) {
            abort(404);
        }

        $headers['Content-Length'] = (string) strlen($bytes);

        return response($bytes, 200, $headers);
    }
}
