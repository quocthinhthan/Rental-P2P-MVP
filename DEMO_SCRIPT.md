

# KỊCH BẢN DÒNG LỆNH DEMO DỰ ÁN

File này chứa toàn bộ các lệnh cần thiết để demo dự án ở Mức độ 2 và Mức độ 3.

---

### BƯỚC 0: DỌN DẸP MÔI TRƯỜNG (Chạy trước khi bắt đầu)

```bash
# Dọn dẹp stack Swarm cũ (nếu có)
docker stack rm p2p_rental_stack

# Dọn dẹp các container Compose cũ (nếu có)
docker-compose down -v

# Trả Docker về trạng thái bình thường (rời khỏi Swarm)
docker swarm leave --force
```

---

### PHẦN 1: DEMO MỨC ĐỘ 2 (SCALING VỚI DOCKER COMPOSE)

```bash
# 1. Khởi chạy hệ thống Level 2 với 3 backend replicas.
# Lệnh này sẽ build image nếu cần và khởi động toàn bộ service.
docker-compose up --build --scale backend=3 -d

# 2. Kiểm tra các container đang chạy để chứng minh có 3 backend.
docker ps

# ---> (Tại đây, mở trình duyệt tại http://localhost và demo các chức năng) <---

# 3. Dọn dẹp môi trường Level 2 sau khi demo xong.
docker-compose down
```

---

### PHẦN 2: DEMO MỨC ĐỘ 3 (TRIỂN KHAI VỚI DOCKER SWARM)

```bash
# 1. Khởi tạo môi trường Swarm.
docker swarm init

# 2. Build các image cần thiết cho việc deploy.
# (Docker Swarm không tự build, nên ta phải build trước bằng compose)
docker-compose build

# 3. Triển khai stack (toàn bộ ứng dụng) lên Swarm.
# (Sử dụng file cấu hình `docker-compose.swarm.yml` riêng)
docker stack deploy -c docker-compose.swarm.yml p2p_rental_stack

# 4. Kiểm tra trạng thái các service trong stack.
# (Đợi vài phút cho cột REPLICAS hiển thị đúng số lượng: 3/3, 1/1)
docker service ls

# Scale lên 5 backend
docker service scale p2p_rental_stack_backend=5


# 5. Dọn dẹp môi trường Swarm sau khi demo xong.
docker stack rm p2p_rental_stack
docker swarm leave --force
```
