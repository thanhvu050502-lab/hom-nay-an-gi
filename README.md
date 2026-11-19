# Hôm nay ăn gì?

Web app (PWA) chọn quán ăn, dessert, đồ uống theo mood, ngân sách, vị trí, thời tiết, từ danh sách quán của bạn và nhóm.

- Giao diện: HTML/CSS/JS thuần, không cần build. Vercel gói Hobby.
- Dữ liệu, đăng nhập, cập nhật trực tiếp, ảnh: Supabase gói Free. Lược đồ ở `supabase/schema.sql`.
- AI (đọc menu, đọc link mạng xã hội, gợi ý tag, Đang hot gì?): Gemini gói Free qua `api/ai.js`.
  Biến môi trường trên Vercel: `GEMINI_API_KEY` (bắt buộc cho AI), `GEMINI_MODEL` (tùy chọn, mặc định `gemini-flash-latest`).
- Bản đồ: Leaflet + OpenStreetMap/CARTO. Thời tiết: Open-Meteo. Đều miễn phí, không cần khóa.
