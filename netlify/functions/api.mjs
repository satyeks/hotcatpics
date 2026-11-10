import { getStore } from "@netlify/blobs";

function sortPresetsDescending(presets) {
  return presets
    .map((p, idx) => ({ p, idx }))
    .sort(
      (a, b) =>
        ((Number(b.p.wishlists) || 0) - (Number(a.p.wishlists) || 0)) ||
        ((Number(b.p.orders) || 0) - (Number(a.p.orders) || 0)) ||
        ((b.p.createdAt || b.idx) - (a.p.createdAt || a.idx))
    )
    .map((x) => x.p);
}

async function loadState(store) {
  try {
    const data = await store.get("db", { type: "json" });
    if (data && typeof data === "object") {
      return {
        presets: Array.isArray(data.presets) ? data.presets : [],
        orders: Array.isArray(data.orders) ? data.orders : []
      };
    }
  } catch (e) {}
  return { presets: [], orders: [] };
}

async function saveState(store, state) {
  await store.setJSON("db", state);
}

export default async (req) => {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  const store = getStore("hotcatpics-data");

  if (pathname === "/api/presets" && req.method === "GET") {
    const db = await loadState(store);
    return Response.json({ presets: sortPresetsDescending(db.presets) });
  }

  if (pathname === "/api/presets" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const db = await loadState(store);
    const id = body.id || `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!db.presets.some((p) => p.id === id)) {
      db.presets.push({
        id,
        model: body.model || "IPHONE 16",
        caseColor: body.caseColor || "white",
        bgColor: body.bgColor || "#5DC6E8",
        stickers: Array.isArray(body.stickers) ? body.stickers : [],
        charm: body.charm || null,
        wishlists: Number(body.wishlists) || 0,
        orders: Number(body.orders) || 0,
        createdAt: body.createdAt || Date.now()
      });
      await saveState(store, db);
    }
    return Response.json({ presets: sortPresetsDescending(db.presets) }, { status: 201 });
  }

  const wishMatch = pathname.match(/^\/api\/presets\/([^/]+)\/wishlist$/);
  if (wishMatch && req.method === "POST") {
    const presetId = wishMatch[1];
    const body = await req.json().catch(() => ({}));
    const delta = Number(body.delta) === -1 ? -1 : 1;
    const db = await loadState(store);
    const target = db.presets.find((p) => p.id === presetId);
    if (target) {
      target.wishlists = Math.max(0, (Number(target.wishlists) || 0) + delta);
      await saveState(store, db);
    }
    return Response.json({ presets: sortPresetsDescending(db.presets) });
  }

  const orderMatch = pathname.match(/^\/api\/presets\/([^/]+)\/order$/);
  if (orderMatch && req.method === "POST") {
    const presetId = orderMatch[1];
    const db = await loadState(store);
    const target = db.presets.find((p) => p.id === presetId);
    if (target) {
      target.orders = (Number(target.orders) || 0) + 1;
      await saveState(store, db);
    }
    return Response.json({ presets: sortPresetsDescending(db.presets) });
  }

  if (pathname === "/api/orders" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const db = await loadState(store);
    const orderRecord = {
      id: body.id || `order_${Date.now()}`,
      placedAt: new Date().toISOString(),
      ...body
    };
    db.orders.push(orderRecord);
    await saveState(store, db);
    return Response.json({ ok: true, order: orderRecord }, { status: 201 });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config = {
  path: ["/api/presets", "/api/presets/*", "/api/orders"]
};
