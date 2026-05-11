import React, { useState, useEffect } from 'react';
import { getAllDisputes, resolveDispute } from '../services/api';
import Spinner from '../components/Common/Spinner';
import Swal from 'sweetalert2'; // Thư viện thông báo đẹp

const AdminDisputesPage = () => {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState(null);

    // Form states
    const [adminDecision, setAdminDecision] = useState('');
    const [winner, setWinner] = useState('owner');
    const [penalizeUser, setPenalizeUser] = useState('none');

    useEffect(() => {
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            const data = await getAllDisputes();
            setDisputes(data);
        } catch (error) {
            Swal.fire('Lỗi!', 'Không thể tải danh sách sự cố.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenResolve = (dispute) => {
        setSelectedDispute(dispute);
        // Tự động cuộn lên đầu modal nếu cần hoặc reset form
        setAdminDecision('');
    };

    const handleResolveSubmit = async (e) => {
        e.preventDefault();

        // Hiển thị xác nhận trước khi gửi
        const result = await Swal.fire({
            title: 'Xác nhận phán quyết?',
            text: "Hành động này sẽ thay đổi trạng thái đơn thuê và không thể hoàn tác!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Đồng ý, gửi phán quyết!',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                let penalizeUserId = null;
                if (penalizeUser === 'renter') penalizeUserId = selectedDispute.rentalId?.renterId;
                if (penalizeUser === 'owner') penalizeUserId = selectedDispute.rentalId?.ownerId;

                await resolveDispute(selectedDispute._id, {
                    adminDecision,
                    winner,
                    penalizeUserId
                });

                await Swal.fire('Thành công!', 'Tranh chấp đã được giải quyết.', 'success');

                setSelectedDispute(null);
                fetchDisputes();
            } catch (error) {
                Swal.fire('Thất bại', 'Có lỗi xảy ra khi xử lý.', 'error');
            }
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="container-fluid px-4 pt-5 pb-5" style={{ minHeight: 'calc(100vh - 120px)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold text-primary">Trung Tâm Xử Lý Tranh Chấp</h2>
                <button className="btn btn-outline-secondary btn-sm" onClick={fetchDisputes}>
                    <i className="bi bi-arrow-clockwise"></i> Làm mới dữ liệu
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Ngày tạo</th>
                                    <th>Mã đơn thuê</th>
                                    <th>Người báo cáo</th>
                                    <th>Lý do tóm tắt</th>
                                    <th>Trạng thái</th>
                                    <th className="text-end pe-4">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disputes.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-5 text-muted">Chưa có sự cố nào cần xử lý.</td></tr>
                                ) : (
                                    disputes.map((dispute) => (
                                        <tr key={dispute._id}>
                                            <td className="ps-4">{new Date(dispute.createdAt).toLocaleDateString('vi-VN')}</td>
                                            <td><code className="text-primary">{dispute.rentalId?._id?.substring(0, 8)}...</code></td>
                                            <td>
                                                <div className="fw-bold">{dispute.reporterId?.fullName}</div>
                                                <small className="text-muted">{dispute.reporterId?.email}</small>
                                            </td>
                                            <td className="text-truncate" style={{ maxWidth: '200px' }}>{dispute.reason}</td>
                                            <td>
                                                <span className={`badge rounded-pill ${dispute.status === 'pending' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                    {dispute.status === 'pending' ? 'Chờ xử lý' : 'Đã xong'}
                                                </span>
                                            </td>
                                            <td className="text-end pe-4">
                                                <button
                                                    className="btn btn-sm btn-dark px-3 shadow-sm"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#disputeDetailModal"
                                                    onClick={() => handleOpenResolve(dispute)}
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL CHI TIẾT & XỬ LÝ */}
            <div className="modal fade" id="disputeDetailModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-xl modal-dialog-scrollable">
                    <div className="modal-content border-0 shadow-lg">
                        <div className="modal-header bg-dark text-white">
                            <h5 className="modal-title">Chi tiết tranh chấp: {selectedDispute?._id}</h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body bg-light">
                            {selectedDispute && (
                                <div className="row g-4">
                                    {/* Cột trái: Thông tin dữ liệu */}
                                    <div className="col-lg-7">
                                        <div className="card border-0 shadow-sm mb-4">
                                            <div className="card-body">
                                                <h6 className="text-muted text-uppercase fw-bold small mb-3">Nội dung khiếu nại</h6>
                                                <p className="lead">{selectedDispute.reason}</p>
                                                <hr />
                                                <h6 className="text-muted text-uppercase fw-bold small mb-3">Bằng chứng hình ảnh ({selectedDispute.evidenceImages?.length || 0})</h6>
                                                <div className="row g-2">
                                                    {selectedDispute.evidenceImages?.map((img, idx) => (
                                                        <div className="col-4" key={idx}>
                                                            <a href={img} target="_blank" rel="noreferrer">
                                                                <img src={img} className="img-fluid rounded border shadow-sm hover-zoom" alt="Evidence" style={{ height: '150px', width: '100%', objectFit: 'cover' }} />
                                                            </a>
                                                        </div>
                                                    ))}
                                                    {(!selectedDispute.evidenceImages || selectedDispute.evidenceImages.length === 0) && <p className="text-muted italic small">Không có hình ảnh đính kèm.</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card border-0 shadow-sm">
                                            <div className="card-body">
                                                <h6 className="text-muted text-uppercase fw-bold small mb-3">Thông tin giao dịch gốc</h6>
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <div className="p-3 border rounded bg-white">
                                                            <small className="text-muted d-block mb-1">Người thuê (Renter)</small>
                                                            <div className="fw-bold text-dark">
                                                                <i className="bi bi-person-fill me-2"></i>
                                                                {selectedDispute.rentalId?.renterId?.fullName || "N/A"}
                                                            </div>
                                                            <small className="text-muted">{selectedDispute.rentalId?.renterId?.email}</small>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="p-3 border rounded bg-white">
                                                            <small className="text-muted d-block mb-1">Chủ đồ (Owner)</small>
                                                            <div className="fw-bold text-dark">
                                                                <i className="bi bi-shop me-2"></i>
                                                                {selectedDispute.rentalId?.ownerId?.fullName || "N/A"}
                                                            </div>
                                                            <small className="text-muted">{selectedDispute.rentalId?.ownerId?.email}</small>
                                                        </div>
                                                    </div>
                                                    <div className="col-12">
                                                        <div className="d-flex justify-content-between align-items-center p-2 px-3 bg-light rounded border">
                                                            <span>Mã đơn thuê: <strong>{selectedDispute.rentalId?._id}</strong></span>
                                                            <span className="badge bg-success fs-6">
                                                                Tổng tiền: {selectedDispute.rentalId?.totalPrice?.toLocaleString()}đ
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cột phải: Form phán quyết */}
                                    <div className="col-lg-5">
                                        <div className="card border-0 shadow-sm border-top border-primary border-4 sticky-top" style={{ zIndex: 1 }}>
                                            <div className="card-body">
                                                <h5 className="mb-4 fw-bold">Hành động của Admin</h5>
                                                {selectedDispute.status === 'pending' ? (
                                                    <form onSubmit={handleResolveSubmit}>
                                                        <div className="mb-3">
                                                            <label className="form-label fw-bold">Phán quyết thắng kiện thuộc về:</label>
                                                            <div className="btn-group w-100" role="group">
                                                                <input type="radio" className="btn-check" name="winner" id="winOwner" value="owner" checked={winner === 'owner'} onChange={() => setWinner('owner')} />
                                                                <label className="btn btn-outline-primary" htmlFor="winOwner">Chủ đồ thắng</label>

                                                                <input type="radio" className="btn-check" name="winner" id="winRenter" value="renter" checked={winner === 'renter'} onChange={() => setWinner('renter')} />
                                                                <label className="btn btn-outline-primary" htmlFor="winRenter">Người thuê thắng</label>
                                                            </div>
                                                        </div>

                                                        <div className="mb-3">
                                                            <label className="form-label fw-bold">Hình thức xử phạt tài khoản:</label>
                                                            <select
                                                                className="form-select"
                                                                value={penalizeUser}
                                                                onChange={(e) => setPenalizeUser(e.target.value)}
                                                            >
                                                                <option value="none">-- Không phạt --</option>
                                                                <option value="owner">Khóa tài khoản Chủ đồ: {selectedDispute.rentalId?.ownerId?.fullName}</option>
                                                                <option value="renter">Khóa tài khoản Người thuê: {selectedDispute.rentalId?.renterId?.fullName}</option>
                                                            </select>
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label fw-bold">Nội dung giải quyết (Gửi cho các bên):</label>
                                                            <textarea
                                                                className="form-control"
                                                                rows="5"
                                                                placeholder="Nhập lý do phán quyết chi tiết..."
                                                                required
                                                                value={adminDecision}
                                                                onChange={(e) => setAdminDecision(e.target.value)}
                                                            ></textarea>
                                                        </div>

                                                        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold shadow">
                                                            GỬI PHÁN QUYẾT CUỐI CÙNG
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <div className="alert alert-success border-0 shadow-sm">
                                                        <h6 className="fw-bold"><i className="bi bi-check-circle-fill"></i> Đã giải quyết xong</h6>
                                                        <hr />
                                                        <p className="small mb-0"><strong>Quyết định:</strong> {selectedDispute.adminDecision}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .hover-zoom { transition: transform .2s; cursor: pointer; }
                .hover-zoom:hover { transform: scale(1.05); }
                .modal-xl { max-width: 90%; }
            `}</style>
        </div>
    );
};

export default AdminDisputesPage;