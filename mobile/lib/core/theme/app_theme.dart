import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class AppColors {
  static const orange = Color(0xffee4d2d);
  static const orangeDark = Color(0xffc83a1d);
  static const orangeLight = Color(0xfffff3ed);
  static const blue = Color(0xff1d4ed8);
  static const blueLight = Color(0xffe8eefb);
  static const green = Color(0xff16a34a);
  static const greenLight = Color(0xffe8f5ee);
  static const red = Color(0xffdc2626);
  static const ink = Color(0xff111827);
  static const muted = Color(0xff6b7280);
  static const line = Color(0xffe5e7eb);
  static const page = Color(0xfff4f4f6);
  static const white = Colors.white;
}

abstract final class AppTheme {
  static ThemeData light() {
    final base = GoogleFonts.interTextTheme();

    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.orange,
      primary: AppColors.orange,
      secondary: AppColors.blue,
      surface: Colors.white,
    );

    return ThemeData(
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.page,
      useMaterial3: true,
      textTheme: base.copyWith(
        displayLarge: base.displayLarge?.copyWith(color: AppColors.ink),
        displayMedium: base.displayMedium?.copyWith(color: AppColors.ink),
        displaySmall: base.displaySmall?.copyWith(color: AppColors.ink),
        headlineLarge:
            base.headlineLarge?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w900),
        headlineMedium:
            base.headlineMedium?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w900),
        headlineSmall:
            base.headlineSmall?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w800),
        titleLarge:
            base.titleLarge?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w700),
        titleMedium:
            base.titleMedium?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w600),
        titleSmall:
            base.titleSmall?.copyWith(color: AppColors.ink, fontWeight: FontWeight.w600),
        bodyLarge: base.bodyLarge?.copyWith(color: AppColors.ink),
        bodyMedium: base.bodyMedium?.copyWith(color: AppColors.ink),
        bodySmall: base.bodySmall?.copyWith(color: AppColors.muted),
        labelLarge: base.labelLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.ink,
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: AppColors.ink,
        ),
      ),
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black.withValues(alpha: 0.06),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.line),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.page,
        selectedColor: AppColors.orangeLight,
        labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
        side: const BorderSide(color: AppColors.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.orange,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.ink,
          side: const BorderSide(color: AppColors.line),
          minimumSize: const Size(0, 44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.orange,
          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.page,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.orange, width: 1.6),
        ),
        labelStyle: GoogleFonts.inter(color: AppColors.muted, fontSize: 14),
        hintStyle: GoogleFonts.inter(color: AppColors.muted.withValues(alpha: 0.7), fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        height: 64,
        elevation: 8,
        shadowColor: Colors.black.withValues(alpha: 0.1),
        surfaceTintColor: Colors.transparent,
        indicatorColor: AppColors.orange.withValues(alpha: 0.12),
        indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => GoogleFonts.inter(
            fontSize: 11,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected)
                ? AppColors.orange
                : AppColors.muted,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            size: 22,
            color: states.contains(WidgetState.selected)
                ? AppColors.orange
                : AppColors.muted,
          ),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.line,
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.ink,
        contentTextStyle: GoogleFonts.inter(color: Colors.white, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
