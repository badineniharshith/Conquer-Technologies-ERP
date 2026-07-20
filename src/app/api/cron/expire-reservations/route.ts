import { NextRequest, NextResponse } from "next/server";
import { checkAndExpireReservationsAction, checkAndExpirePurchaseOrdersAction } from "@/app/actions";

// Cron endpoint to automatically expire reservations and opportunities
// Call this endpoint periodically (e.g. via Vercel Cron, external scheduler, or browser timer)
// GET /api/cron/expire-reservations

export async function GET(req: NextRequest) {
  try {
    // Optional: verify cron secret for security
    const cronSecret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run both expiry checks in parallel
    const [reservationResult, purchaseOrderResult] = await Promise.allSettled([
      checkAndExpireReservationsAction(),
      checkAndExpirePurchaseOrdersAction()
    ]);

    const reservations = reservationResult.status === "fulfilled" 
      ? reservationResult.value 
      : { error: (reservationResult as any).reason?.message };

    const purchaseOrders = purchaseOrderResult.status === "fulfilled" 
      ? purchaseOrderResult.value 
      : { error: (purchaseOrderResult as any).reason?.message };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        reservationsExpired: reservations,
        opportunitiesExpired: purchaseOrders
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
