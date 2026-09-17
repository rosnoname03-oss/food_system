<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MenuItem;
use App\Models\UploadedImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Pictures must survive a container restart, so they are stored as rows in the
 * database rather than as files on the (ephemeral) container filesystem.
 */
class MenuItemImageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Test Admin',
            'email' => 'image-test-admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);
    }

    private function category(): Category
    {
        return Category::create([
            'name' => 'Test Category',
            'status' => true,
            'sort_order' => 1,
        ]);
    }

    public function test_uploaded_picture_is_stored_in_the_database_and_served_over_https(): void
    {
        $category = $this->category();

        $response = $this->actingAs($this->admin(), 'sanctum')->post('/api/admin/menu-items', [
            'category_id' => $category->id,
            'name' => 'Grilled Fish',
            'price' => 6.50,
            'type' => 'food',
            'image_file' => UploadedFile::fake()->image('fish.jpg', 2000, 1500),
        ]);

        $response->assertCreated();

        // The picture lives in the database, not on disk.
        $this->assertSame(1, UploadedImage::count());
        $stored = UploadedImage::first();

        $item = MenuItem::where('name', 'Grilled Fish')->firstOrFail();
        $this->assertSame('db:' . $stored->id, $item->image, 'menu item should reference the database picture');

        // Nothing was written to the disk that gets wiped on restart.
        $this->assertFalse(is_dir(storage_path('app/public/menu_items')) && count(glob(storage_path('app/public/menu_items/*'))) > 0);

        // The API hands the browser an absolute HTTPS url.
        $url = $response->json('item.image');
        $this->assertSame('https://example.test/api/images/' . $stored->id, $url);

        // And that url actually returns the image bytes.
        $image = $this->get('/api/images/' . $stored->id);
        $image->assertOk();
        $image->assertHeader('Content-Type', $stored->mime_type);
        $this->assertNotEmpty($image->getContent());
        $this->assertNotFalse(@getimagesizefromstring($image->getContent()), 'served bytes should be a real image');
    }

    public function test_large_photo_is_downscaled_before_being_stored(): void
    {
        $category = $this->category();

        $this->actingAs($this->admin(), 'sanctum')->post('/api/admin/menu-items', [
            'category_id' => $category->id,
            'name' => 'Big Photo Dish',
            'price' => 3.00,
            'type' => 'food',
            'image_file' => UploadedFile::fake()->image('huge.jpg', 3000, 2000),
        ])->assertCreated();

        $stored = UploadedImage::firstOrFail();
        [$width, $height] = getimagesizefromstring(base64_decode($stored->data));

        $this->assertLessThanOrEqual(1200, $width);
        $this->assertLessThanOrEqual(1200, $height);
    }

    public function test_saving_without_a_new_file_keeps_the_same_picture(): void
    {
        $category = $this->category();
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->post('/api/admin/menu-items', [
            'category_id' => $category->id,
            'name' => 'Keep My Picture',
            'price' => 5.00,
            'type' => 'food',
            'image_file' => UploadedFile::fake()->image('keep.jpg', 800, 600),
        ]);
        $created->assertCreated();

        $item = MenuItem::where('name', 'Keep My Picture')->firstOrFail();
        $originalReference = $item->image;
        $resolvedUrl = $created->json('item.image');

        // The admin form resends the resolved URL when the picture is untouched.
        // That must collapse back to "db:N", not be stored as an absolute url.
        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/menu-items/' . $item->id, [
                'category_id' => $category->id,
                'name' => 'Keep My Picture',
                'price' => 5.00,
                'type' => 'food',
                'image' => $resolvedUrl,
            ])
            ->assertOk();

        $this->assertSame($originalReference, $item->fresh()->image);
        $this->assertSame(1, UploadedImage::count(), 'no orphan picture rows');
    }

    public function test_replacing_a_picture_removes_the_old_one(): void
    {
        $category = $this->category();
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->post('/api/admin/menu-items', [
            'category_id' => $category->id,
            'name' => 'Replace Me',
            'price' => 2.00,
            'type' => 'food',
            'image_file' => UploadedFile::fake()->image('old.jpg', 400, 300),
        ])->assertCreated();

        $item = MenuItem::where('name', 'Replace Me')->firstOrFail();
        $oldImageId = (int) substr($item->image, 3);

        $this->actingAs($admin, 'sanctum')->post('/api/admin/menu-items/' . $item->id, [
            '_method' => 'PUT',
            'category_id' => $category->id,
            'name' => 'Replace Me',
            'price' => 2.00,
            'type' => 'food',
            'image_file' => UploadedFile::fake()->image('new.jpg', 500, 400),
        ])->assertOk();

        $this->assertNull(UploadedImage::find($oldImageId), 'old picture should be deleted');
        $this->assertSame(1, UploadedImage::count());
        $this->assertNotSame('db:' . $oldImageId, $item->fresh()->image);
    }

    public function test_deleting_an_item_removes_its_picture(): void
    {
        $category = $this->category();
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->post('/api/admin/menu-items', [
            'category_id' => $category->id,
            'name' => 'Delete Me',
            'price' => 1.50,
            'type' => 'food',
            'image_file' => UploadedFile::fake()->image('gone.jpg', 300, 300),
        ])->assertCreated();

        $item = MenuItem::where('name', 'Delete Me')->firstOrFail();
        $this->assertSame(1, UploadedImage::count());

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/admin/menu-items/' . $item->id)
            ->assertOk();

        $this->assertSame(0, UploadedImage::count(), 'picture row should be cleaned up');
    }

    public function test_plain_image_urls_still_work(): void
    {
        $category = $this->category();
        $remote = 'https://images.unsplash.com/photo-123?w=600';

        $response = $this->actingAs($this->admin(), 'sanctum')->postJson('/api/admin/menu-items', [
            'category_id' => $category->id,
            'name' => 'Linked Picture',
            'price' => 7.00,
            'type' => 'food',
            'image' => $remote,
        ]);

        $response->assertCreated();
        $this->assertSame($remote, $response->json('item.image'));
        $this->assertSame(0, UploadedImage::count());
    }
}
