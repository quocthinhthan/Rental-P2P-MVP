import 'dart:io';
import 'package:flutter/foundation.dart';

abstract final class AppConfig {
  static final String apiBaseUrl = const String.fromEnvironment('API_BASE_URL').isNotEmpty
      ? const String.fromEnvironment('API_BASE_URL')
      : _defaultUrl;

  static String get _defaultUrl {
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
  }
}
