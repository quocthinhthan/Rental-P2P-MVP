# Rental P2P Mobile

Flutter client tối thiểu cho backend hiện có của dự án.

## Luồng đã có

- Đăng ký, đăng nhập.
- Xem danh sách đồ cho thuê.
- Xem chi tiết đồ.
- Tạo yêu cầu thuê và lấy link thanh toán VNPay nếu backend đã cấu hình.
- Xem đơn tôi thuê, đơn tôi cho thuê, đồ tôi đăng.
- Chủ đồ xác nhận hoặc từ chối đơn đang chờ xác nhận.
- Đăng đồ cho thuê.
- Cập nhật hồ sơ và xác minh nhanh bằng số CCCD để demo luồng cần eKYC.

## Cấu trúc

App đang được tách theo hướng clean architecture vừa đủ cho MVP:

```text
lib/
  app/                  # App root, navigation shell, wiring dependencies
  core/
    config/             # AppConfig, dart-define
    errors/             # Exception dùng chung
    network/            # ApiClient dùng chung
    utils/              # Formatter/helper thuần
    widgets/            # Widget dùng chung
  features/
    account/
      data/             # AccountRepository
      presentation/     # AccountPage
    auth/
      data/             # AuthRepository, AppUser, UserSession
      presentation/     # AuthPage
    items/
      data/             # Item models, ItemsRepository
      presentation/     # List/detail/post item pages
    rentals/
      data/             # Rental models, RentalsRepository
      presentation/     # MyRentalsPage
```

Quy ước khi code tiếp:

- Gọi HTTP ở repository, không gọi trực tiếp trong page.
- Parse JSON vào model trong `data/`, tránh truyền `Map<String, dynamic>` xuyên UI.
- Widget/page chỉ giữ state màn hình và điều phối hành động người dùng.
- Logic dùng chung đặt trong `core/`, không copy giữa các feature.

## Chạy app

Backend chạy trực tiếp Node thường expose API ở `http://localhost:5000/api`. Với Chrome hoặc Windows desktop, app dùng mặc định:

```bash
flutter run
```

Nếu chạy qua Docker/Nginx port 80:

```bash
flutter run --dart-define=API_BASE_URL=http://localhost/api
```

Nếu chạy trên Android emulator:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2/api
```

Nếu chạy trên thiết bị thật:

```bash
flutter run --dart-define=API_BASE_URL=http://<LAN-IP-cua-may-dev>/api
```
