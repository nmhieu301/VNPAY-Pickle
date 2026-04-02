import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import venueData from '../../../../../hanoi-pickleball-courts.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const venues = venueData.venues.map(v => ({
      name: v.name,
      address: v.address,
      district: v.district || null,
      latitude: v.latitude || null,
      longitude: v.longitude || null,
      num_courts: v.num_courts || null,
      rating: v.rating || null,
      phone: v.phone === 'N/A' ? null : v.phone || null,
      hours: v.hours === 'N/A' ? null : v.hours || null,
      features: v.features || [],
      place_id: v.place_id || null,
      price_note: v.price_note || null,
      is_indoor: v.features?.includes('indoor') || false,
    }));

    const { data, error } = await supabase
      .from('venues')
      .upsert(venues, { onConflict: 'name' })
      .select('id');

    if (error) {
      console.error('Import venues error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (err) {
    console.error('Import venues exception:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
