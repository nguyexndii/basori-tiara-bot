# 📋 SỔ TAY PHÂN CÔNG CHỨC NĂNG CÁC BOT TRÊN SERVER "TỔ DÂN PHỐ"
> **Máy chủ:** Tổ Dân Phố (ID: `1389834422773219338`)  
> **Thời gian cập nhật:** 17/10/2026  
> **Tổng số bot đang hoạt động:** 12 Bots

---

## 🧭 BẢNG TỔNG QUAN NHANH

| STT | Tên Bot | Nhóm Role | Chức năng chính | Kênh hoạt động trọng tâm |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Basori Tiara** | `Trật Tự Đô Thị` / Admin | Kỹ thuật viên server, Quản gia AI Butler, kiểm toán bảo mật, báo trạng thái Online / Reconnect kèm tag Admin. | Toàn server, khu STAFF, kênh log lỗi |
| **2** | **YAGPDB.xyz** | `Trật Tự Đô Thị` | Hệ thống EXP 99 cấp độ, tự động thăng hạng 4 Role Level, lệnh `-rank`, xác minh thành viên mới. | Chat công cộng, kênh test rank, kênh xác minh |
| **3** | **Dyno** | `Trật Tự Đô Thị` | Cấp role tự động (thông báo code game, game free, quyền phát nhạc), bảo mật & lọc từ khóa xấu. | `#🌾︱nhận-sổ-gạo`, toàn server |
| **4** | **Carl-bot** | `Trật Tự Đô Thị` | Ghi nhật ký (Audit Logging): tin nhắn xóa/sửa, thành viên join/leave, đổi role. | `#c_log-mess`, `#c_log-join_leave`, `#log-member` |
| **5** | **Zira** | `Trật Tự Đô Thị` | Bảng bấm nút/emoji tự nhận vai trò dự phòng. | `#🌾︱nhận-sổ-gạo` |
| **6** | **Anna Music** | `Dịch Vụ Công` | Bot phát nhạc chất lượng cao số 1. | `#🔊︱trà-đá-vỉa-hè`, `#🔊︱ka-ra-oke`, `#🎶︱đài-cassette` |
| **7** | **Rythm** | `Dịch Vụ Công` | Bot phát nhạc dự phòng. | `#🔊︱trà-đá-vỉa-hè`, `#🔊︱ka-ra-oke`, `#🎶︱đài-cassette` |
| **8** | **Anna Yanami** | `Dịch Vụ Công` | Quản trò minigame (Nối từ, Xếp từ), Săn code đa game (WuWa, Hoyo, Endfield), Bảng tin Gacha AI, Giữ voice 24/7, Xoay Kaomoji, Báo lỗi tag Admin. | `#🧠︱nối-từ`, `#🤯︱sắp-xếp-từ`, `#💸︱trợ-cấp-thất-nghiệp`, `#📰︱bảng-tin-gacha`, `#🔊︱trà-đá-vỉa-hè` |
| **9** | **FreeStuff** | `Dịch Vụ Công` | Tự động cập nhật và báo game Free 100% từ Steam/Epic Games. | `#💵︱free-game` |
| **10**| **Hoyo Buddy** | `Dịch Vụ Công` | Tra cứu thông tin, lịch trình game miHoYo. | `#💸︱trợ-cấp-thất-nghiệp` |
| **11**| **Hoyo Code Sender** | `Dịch Vụ Công` | Tự động phát giftcode mới của Genshin/Honkai/ZZZ. | `#💸︱trợ-cấp-thất-nghiệp` |
| **12**| **FlaviBot** | `Dịch Vụ Công` | Tiện ích bổ trợ anime/game. | `#💬︱chung`, `#📷︱ảnh-tào-lao` |

---

## 🔍 CHI TIẾT NHIỆM VỤ TỪNG BOT

### 1. 🤖 Basori Tiara (Bot Riêng Của Bạn - "Cánh Tay Phải")
* **Vai trò:** Bot vận hành kỹ thuật viên độc quyền của Tổ Dân Phố, sở hữu quyền `Administrator`.
* **Mã nguồn:** Nằm tại thư mục `d:\discord-bot\basori-tiara-bot`.
* **Nhiệm vụ cụ thể:**
  1. **Thông báo trạng thái Online & Tự phục hồi kết nối (Reconnect/Resume):**
     * Mỗi khi bot khởi động hoặc bị ngắt kết nối (DC) và kết nối lại thành công ➔ Tự động gửi thông báo vào kênh `#🚨︱bot-health-error` (ID: `1547449482835394640`) và **Tag trực tiếp Admin** `<@875358286487097395>`.
     * **Loại bỏ hoàn toàn gửi tin nhắn riêng (DM) cho Admin:** Mọi cảnh báo lỗi, sự cố và trạng thái bot đều được quy tụ tập trung vào kênh `#🚨︱bot-health-error`, tuyệt đối không gửi DM riêng làm phiền hộp thư cá nhân của Admin.
  2. **Quản gia AI & Kiểm toán bảo mật chuyên sâu:**
     * Vận hành hệ thống Quản gia AI Butler (nhận lệnh ngôn ngữ tự nhiên từ Admin).
     * Ghi toàn bộ nhật ký quản trị, tin nhắn xóa/sửa, cảnh báo bảo mật anti-spam vào kênh `#👑︱tiara-bot-log` (ID: `1559750487299850331`).
  3. **Cơ chế Chống Sập (Anti-Crash 24/7):** Tự bắt các ngoại lệ lỗi mạng để không bị crash bot; nếu phát hiện ngoại lệ chưa xử lý sẽ tự động gửi log chi tiết vào kênh `#🚨︱bot-health-error` kèm tag Admin.

---

### 2. ⚡ YAGPDB.xyz (Hệ Thống Cấp Độ & EXP + Cổng Xác Minh)
* **Vai trò:** Quản lý hành trình hoạt động của cư dân, thăng hạng vai trò và cổng xác minh bảo vệ server.
* **Nhiệm vụ cụ thể:**
  1. **Cổng xác minh (Verification Gate):** Tiếp nhận và xác minh thành viên mới vào server để chống bot raid/spam và mở quyền vào các kênh sinh hoạt.
  2. **Tự động tích lũy EXP khi chat:** Tin nhắn dài từ 6 ký tự trở lên sẽ được cộng ngẫu nhiên 15-25 EXP (hồi chiêu 60 giây).
  3. **Tự động thăng cấp và gán 4 mốc Role Level:**
     * **Lv.1:** `🌱 [Lv.1] Cư Dân Mới Nhú`
     * **Lv.33:** `🍵 [Lv.33] Gương Mặt Thân Quen`
     * **Lv.66:** `🏅 [Lv.66] Gia Đình Văn Hóa`
     * **Lv.99:** `👑 [Lv.99] Cây Đa Cây Đề` (Cảnh giới tối cao)
  4. **Hệ thống lệnh EXP:**
     * **Lệnh xem rank:** `-rank` (xem bản thân) hoặc `-rank @user` (xem người khác). Hiển thị thẻ tiến trình khối `███░░░░░░░` và tỷ lệ `%` thăng cấp.
     * **Lệnh buff EXP (Độc quyền Admin ID `875358286487097395`):** Cú pháp `-setxp <số_exp>` hoặc `-setxp @user <số_exp>`. Tự động gán đúng 4 Role Level tương ứng ngay lập tức.

---

### 3. 🛡️ Dyno & Carl-bot (Cấp Role Tiện Ích, Tuần Tra & Giám Sát Log)
* **Dyno:**
  * **Cấp Role Tự Động / Reaction Roles:**
    * Cấp role nhận **thông báo giftcode game** (`WuWa`, `Genshin`, `Honkai`, `ZZZ`, `Endfield`).
    * Cấp role nhận **thông báo game Free 100%** từ Steam, Epic Games, GOG.
    * Cấp role **quyền phát nhạc (DJ / Music Controller)** để cư dân có quyền điều khiển bot nhạc tại phòng voice và kênh `#🎶︱đài-cassette`.
  * **Bảo vệ an ninh:** Lọc từ ngữ phản cảm, ngăn chặn gửi link lừa đảo/scam, chặn spam tag `@everyone` diện rộng.
* **Carl-bot:**
  * Thư ký ghi chép nhật ký 24/7 (Audit Logger):
    * Tin nhắn bị thu hồi, chỉnh sửa ➔ Ghi vào `#c_log-mess`.
    * Thành viên mới tham gia hoặc thoát server ➔ Ghi vào `#c_log-join_leave`.
    * Thay đổi vai trò, đổi nickname, thăng giáng cấp ➔ Ghi vào `#log-member`.

---

### 4. 🎫 Zira (Phát Sổ Gạo & Đăng Ký Role)
* **Vai trò:** Tự động phát vai trò khi người dùng tương tác.
* **Nhiệm vụ cụ thể:** Đặt bài viết bấm nút tại kênh `#🌾︱nhận-sổ-gạo` để cư dân tự nhận role `🍚 Diện Nhận Trợ Cấp` (để nhận thông báo phát giftcode và quà tặng).

---

### 5. 🎶 Anna Music & Rythm (Đài Phát Thanh & Giải Trí)
* **Anna Music (Bot chính):**
  * **Mã nguồn:** Nằm tại thư mục `d:\discord-bot\anna\anna-music-bot` (Backend) & `d:\discord-bot\anna\anna-music-bot-ui` (Web Player).
  * **Chức năng:** Chuyên phát nhạc âm lượng chuẩn, không giật lag tại các phòng voice; hỗ trợ YouTube, Spotify, SoundCloud, ZingMP3, treo 24/7 Lofi nền, Web Player thời gian thực.
  * **Cơ chế báo lỗi & cảnh báo tập trung (Thay thế DM riêng):**
    * Mọi thông báo trạng thái bot (Khởi động Online, Tắt bot, Shard Reconnect, Web Player Disconnect), cảnh báo **Cookie YouTube hết hạn** và các lỗi phát nhạc/hệ thống đều được tự động gửi thẳng vào kênh `#🚨︱bot-health-error` (ID: `1547449482835394640`).
    * Tự động **tag Admin** (`<@875358286487097395>`) có còi thông báo để Admin phát hiện ngay lập tức mà không làm phiền hộp thư riêng (DM).
  * **Kênh gửi lệnh:** Kênh văn bản `#🎶︱đài-cassette` (hoặc slash command `/play`).
* **Rythm (Bot phụ):** Dự phòng khi Anna bận hoặc cần phát đồng thời 2 phòng voice khác nhau.

---

### 6. 🎮 Anna Yanami (Minigame, Săn Code, Bảng Tin Gacha & Giữ Phòng Voice)
* **Mã nguồn:** Nằm tại thư mục `d:\discord-bot\anna\anna-bot`.
* **Nhiệm vụ cụ thể:**
  1. **Minigames Tiếng Việt Trí Tuệ:**
     * Kênh `#🧠︱nối-từ`: Điều khiển minigame Nối từ 2 tiếng, tự động trọng tài, tính điểm đua Top, chống nối từ đảo ngược và chống tự chơi một mình.
     * Kênh `#🤯︱sắp-xếp-từ`: Đưa ra câu đố đảo chữ tiếng Việt, tự động cung cấp gợi ý, chống race condition khi nhiều người cùng trả lời.
  2. **Tự Động Săn Giftcode Đa Game (Multi-Game Code Watcher):**
     * Kênh `#💸︱trợ-cấp-thất-nghiệp`: Tự động cào mã Giftcode mới nhất từ Kuro Games (**Wuthering Waves**), HoYoverse (**Genshin Impact, Honkai: Star Rail, Zenless Zone Zero**) và Gryphline (**Arknights: Endfield**). Có nút bấm sao chép nhanh 1 chạm và link nạp code trực tiếp.
  3. **Bảng Tin Cập Nhật Gacha Games Đa Vũ Trụ (AI-Powered):**
     * Kênh `#📰︱bảng-tin-gacha`: Tự động quét thông báo cập nhật, dùng Google Gemini AI tóm tắt ngắn gọn các điểm nổi bật (nhân vật, sự kiện, đền bù) và đăng bài Forum tự động.
  4. **Giữ Phòng Voice 24/7 Thông Minh (Voice Keeper):**
     * Kênh `#🔊︱trà-đá-vỉa-hè`: Bot phụ túc trực giữ phòng tránh Discord reset thời gian khi phòng có dưới 2 người hoặc chưa có bot nhạc. Khi đã có đủ từ 2 người thật + bot nhạc Anna Music thì bot phụ tự động rời phòng nhường chỗ. Có lệnh admin `!checkvoice`, `!leavevoice`, `!evalvoice`.
  5. **Hệ Thống Custom Status Kaomoji Xoay Tua (122+ Biểu Cảm):**
     * Tự động đổi trạng thái bong bóng đại diện mỗi 60 giây với 122+ Kaomoji phong phú theo tính cách Anna (đồ ăn, minigame, hờn dỗi `o(>< )o`, chill...). Lệnh admin đổi ngay: `!nextstatus`.
  6. **Kênh Báo Lỗi & Cảnh Báo Hệ Thống Tập Trung:**
     * Toàn bộ log lỗi hệ thống, sập bot, crash hoặc gián đoạn dịch vụ được chuyển hướng trực tiếp vào kênh `#🚨︱bot-health-error` (ID: `1547449482835394640`) kèm **Tag trực tiếp Admin** `<@875358286487097395>` thay vì gửi DM riêng. Lệnh test: `!testerror`.

---

### 7. 🎁 FreeStuff & Hoyo Bots (Phúc Lợi Cư Dân)
* **FreeStuff:** Tự động săn các deal game bản quyền trị giá 0đ từ Steam, Epic Games, GOG và gửi ngay vào `#💵︱free-game`.
* **Hoyo Code Sender & Hoyo Buddy:** Tự động cào mã giftcode đổi quà (Primogems, Stellar Jade, Polychrome) của các game Genshin/Honkai/ZZZ và Arknights gửi vào `#💸︱trợ-cấp-thất-nghiệp`.

---

## 🚀 CÁCH KHỞI ĐỘNG BOT "BASORI TIARA"

Khi bạn muốn khởi động bot **Basori Tiara**:
1. Mở Terminal (PowerShell hoặc CMD).
2. Di chuyển vào thư mục bot:
   ```powershell
   cd d:\discord-bot\basori-tiara-bot
   ```
3. Chạy lệnh:
   ```powershell
   node index.js
   ```
4. Khi màn hình console hiện:
   ```text
   📦 Đã nạp thành công 22 lệnh Slash từ các module.
   ⚡ Đã đăng ký thành công 9 sự kiện Discord.
   🤖 [ONLINE] Bot đã đăng nhập: Basori Tiara#6614
   ```
   Bot sẽ tự động gửi thông báo trực tuyến và tag Admin `<@875358286487097395>` tại kênh `#🚨︱bot-health-error` (`1547449482835394640`)!

---

## 📊 BẢNG TỔNG QUAN PHÂN LUỒNG 4 KÊNH LOG (CHUẨN HÓA MỚI NHẤT)

| STT | Tên Kênh | Channel ID | Đối tượng theo dõi chính | Bot đổ dữ liệu vào | Mức độ ưu tiên thông báo |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **`#🛡️︱mod-chat-log`** | `1560968766173614150` | Nội dung tin nhắn, xử phạt & an ninh chat (xóa, sửa, purge, timeout, ban, kick) | **Carl-bot + Tiara** | Tắt thông báo *(Chỉ xem khi tra cứu)* |
| **2** | **`#👥︱member-voice-log`** | `1560968768161579120` | Thành viên ra/vào server, hồ sơ (đổi role/name/avatar) & phòng Voice | **Carl-bot + Anna Music + Tiara** | Tắt thông báo *(Chạy ngầm liên tục)* |
| **3** | **`#🤖︱bot-activity-log`** | `1560968770221117511` | Lệnh người dùng bấm, Web Player, AI & Sự kiện (Giftcode mới, tin Gacha) | **Tiara + Anna Music + Anna Minigame** | Tắt thông báo *(flags: 4096)* |
| **4** | **`#🚨︱bot-health-error`** | `1547449482835394640` | Sức khỏe máy chủ, trạng thái Online/Off, Lỗi code/Exception *(thay vì DM Admin)* | **Cả 3 Bot nhà trồng** | **BẬT THÔNG BÁO** *(Tag Admin khi Crash)* |
| **5** | **`#👑︱tiara-bot-log`** | `1559750487299850331` | Log điều hành tập trung & bảo mật chuyên sâu của bot Basori Tiara *(đổi từ `t-log`)* | **Basori Tiara** | Tắt thông báo |
| **6** | **`#🎵︱music-room-log`** | `1543841691541180546` | Log hoạt động phát nhạc, danh sách bài hát và phòng voice room *(đổi từ `a_log-all`)* | **Anna Music** | Tắt thông báo |

> 🗑️ **Các kênh log cũ đã xóa an toàn khỏi danh mục STAFF:**
> - `#c_log-mess` (ID: `1389854538168533022`)
> - `#c_log-join_leave` (ID: `1389854645161295922`)
> - `#log-blackjack` (ID: `1450093401214029958`)
> - `#log-diem-danh` (ID: `1450093510077452288`)
