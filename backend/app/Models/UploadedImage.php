<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UploadedImage extends Model
{
    protected $fillable = [
        'filename',
        'mime_type',
        'byte_size',
        'data',
    ];

    /**
     * Never leak the base64 payload through JSON responses.
     */
    protected $hidden = [
        'data',
    ];

    protected function casts(): array
    {
        return [
            'byte_size' => 'integer',
        ];
    }
}
