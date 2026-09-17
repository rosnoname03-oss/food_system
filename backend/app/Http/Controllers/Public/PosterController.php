<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PosterResource;
use App\Models\Poster;
use Illuminate\Http\JsonResponse;

class PosterController extends Controller
{
    /**
     * Get active posters/banners for promotional carousel.
     */
    public function index(): JsonResponse
    {
        $posters = Poster::active()
            ->orderBy('id', 'desc')
            ->get();

        return PosterResource::collection($posters)
            ->response()
            ->header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    }
}
