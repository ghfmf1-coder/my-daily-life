self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())await caches.delete(key);await self.registration.unregister();})()));
self.addEventListener('fetch',event=>{event.respondWith(new Response('<!doctype html><meta name="robots" content="noindex"><h1>서비스가 종료되었습니다.</h1>',{status:410,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}));});
