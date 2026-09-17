<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class MenuItemSeeder extends Seeder
{
    /**
     * No sample menu items are seeded.
     *
     * The real menu is created by the restaurant through the admin dashboard,
     * and seeded placeholders only got in the way: they matched real items by
     * name and reset their pictures and prices back to stock photos.
     *
     * Categories are handled by CategorySeeder, which runs before this one.
     */
    public function run(): void
    {
        //
    }
}
