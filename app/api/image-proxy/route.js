// app/api/image-proxy/route.js
// Note: Assumes Node.js >= 18 for built-in fetch
// If using older Node, install and import 'node-fetch' as above

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid URL parameter' }, { status: 400 });
  }

  // Basic validation (optional but recommended)
  try {
    const allowedDomains = ['media.licdn.com'];
    const urlObject = new URL(imageUrl);
    if (!allowedDomains.includes(urlObject.hostname)) {
        console.warn(`Blocked proxy request for disallowed domain: ${urlObject.hostname}`);
        return NextResponse.json({ error: 'Proxying from this domain is not allowed.' }, { status: 403 });
    }

    // Fetch the image from the external URL
    const imageResponse = await fetch(imageUrl); // Use built-in fetch

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error(`Failed to fetch image from ${imageUrl}: ${imageResponse.status} ${imageResponse.statusText}`, errorText);
      // Cannot easily forward the exact status text in the simple case here
      return NextResponse.json({ error: `Failed to fetch image: Status ${imageResponse.status}` }, { status: imageResponse.status });
    }

    // Get content type and the image data (as Blob/ArrayBuffer)
    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
    const imageBuffer = await imageResponse.arrayBuffer();

    // Return the image data with correct headers
    const response = new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
         // CORS header - handled automatically by Next.js API routes usually,
         // but explicitly setting might be needed depending on config.
         // By default, API routes allow same-origin, check your Next.js config if needed.
        'Access-Control-Allow-Origin': '*', // Be more specific in production!
      },
    });

    return response;

  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
         return NextResponse.json({ error: 'Invalid URL format provided.' }, { status: 400 });
    }
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error proxying image' }, { status: 500 });
  }
}