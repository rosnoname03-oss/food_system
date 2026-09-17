<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Uploaded pictures are kept inside the database instead of the container
     * filesystem, which is wiped on every deploy/restart on ephemeral hosts.
     */
    public function up(): void
    {
        Schema::create('uploaded_images', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('mime_type', 100)->default('image/jpeg');
            $table->unsignedInteger('byte_size')->default(0);
            $table->longText('data'); // base64 encoded bytes, portable across pgsql/sqlite
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uploaded_images');
    }
};
