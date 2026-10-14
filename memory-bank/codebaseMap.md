# Codebase Map & File Responsibilities

## anna-music-bot (Bot nhạc chính - VPS)
- `src/index.js`: Khởi chạy bot, kết nối Discord client, nạp Slash Commands & xử lý tương tác nút bấm.
- `src/config.js`: Nạp biến môi trường `.env`, tokens, API keys, cấu hình kênh và stream mặc định.
- `src/structures/MusicQueue.js`: Trái tim phát nhạc (AudioPlayer, VoiceConnection, hàng chờ, Autoplay transition, 24/7 Lofi).
- `src/structures/HistoryManager.js`: Quản lý lịch sử phát (RAM + MongoDB), thuật toán chống lặp bài (`isRecentlyPlayed`, Video ID).
- `src/structures/SettingsManager.js`: Quản lý cài đặt cấu hình server (chế độ 24/7, DJ Only, kênh log, âm lượng mặc định).
- `src/structures/SessionManager.js`: Quản lý session và tự động phục hồi kết nối voice khi bot restart.
- `src/utils/musicExtractor.js`: Trích xuất âm thanh (yt-dlp, FFmpeg, SoundCloud fallback) & thuật toán tìm bài liên quan 4 tầng.
- `src/utils/geminiHelper.js`: Tích hợp Gemini DJ AI gợi ý bài hát theo vibe văn hóa & tìm nhạc bằng ngôn ngữ tự nhiên.
- `src/utils/debugLogger.js`: Ghi log sự kiện nhanh vào `logs/events.log` phục vụ chẩn đoán tức thì (<0.2s).
- `src/routes/api.js`: Express REST API cho Web Player UI (lấy state phòng, điều khiển nhạc, live search, tra cứu log).

## anna-bot (Bot phụ - Discloud)
- `src/index.js`: Khởi chạy bot phụ, xử lý Minigames (Nối từ, Scramble, WuWa codes).
- `src/features/voiceKeeper.js`: Thuật toán Smart Voice Keeper tự động giữ phòng voice không bị reset thời gian tạo.

## anna-music-bot-ui (Web Player - Cloudflare Pages)
- `src/`: Giao diện React + Vite + Tailwind điều khiển phát nhạc từ xa, quản lý playlist và hiển thị lời bài hát real-time.
