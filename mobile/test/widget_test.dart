import 'package:flutter_test/flutter_test.dart';
import 'package:rental_p2p_mobile/app/rental_app.dart';

void main() {
  testWidgets('shows auth screen', (WidgetTester tester) async {
    await tester.pumpWidget(const RentalApp());

    expect(find.text('Rental P2P'), findsOneWidget);
    expect(find.text('Marketplace thuê đồ cá nhân'), findsOneWidget);
    expect(find.text('Đăng nhập'), findsWidgets);
  });
}
