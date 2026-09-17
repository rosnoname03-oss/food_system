<?php

namespace Database\Seeders;

use App\Models\Poster;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminSeeder::class,
            CategorySeeder::class,
            MenuItemSeeder::class,
            TableSeeder::class,
        ]);
    }
}
