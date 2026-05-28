import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:rental_p2p_mobile/core/errors/api_exception.dart';

class ApiClient {
  ApiClient(this.baseUrl);

  final String baseUrl;
  String? token;

  Future<dynamic> get(String path, {Map<String, String>? query}) {
    return _send('GET', path, query: query);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) {
    return _send('POST', path, body: body);
  }

  Future<dynamic> put(String path, Map<String, dynamic> body) {
    return _send('PUT', path, body: body);
  }

  Future<dynamic> patch(String path, Map<String, dynamic> body) {
    return _send('PATCH', path, body: body);
  }

  Future<dynamic> delete(String path) {
    return _send('DELETE', path);
  }

  Future<dynamic> uploadFile(
    String path, {
    required String fieldName,
    required String filename,
    required Uint8List bytes,
  }) async {
    final uri = Uri.parse('$baseUrl$path');

    try {
      final request = http.MultipartRequest('POST', uri);
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.files.add(http.MultipartFile.fromBytes(
        fieldName,
        bytes,
        filename: filename,
        contentType: _contentTypeFor(filename),
      ));

      final response = await request.send();
      final text = await response.stream.bytesToString();
      final decoded = text.isEmpty ? null : jsonDecode(text);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message = _errorMessage(decoded, response.statusCode);
        throw ApiException(message);
      }

      return decoded;
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('KhĂ´ng káº¿t ná»‘i Ä‘Æ°á»£c API: $baseUrl');
    }
  }

  MediaType _contentTypeFor(String filename) {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return MediaType('image', 'png');
    if (lower.endsWith('.webp')) return MediaType('image', 'webp');
    if (lower.endsWith('.gif')) return MediaType('image', 'gif');
    return MediaType('image', 'jpeg');
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);

    try {
      final headers = <String, String>{'Content-Type': 'application/json'};
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) {
        request.body = jsonEncode(body);
      }

      final response = await request.send();
      final text = await response.stream.bytesToString();
      final decoded = text.isEmpty ? null : jsonDecode(text);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message = _errorMessage(decoded, response.statusCode);
        throw ApiException(message);
      }

      return decoded;
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException('Không kết nối được API: $baseUrl');
    }
  }

  String _errorMessage(Object? decoded, int statusCode) {
    if (decoded is Map) {
      final message = decoded['message']?.toString();
      final detail = decoded['error']?.toString();

      if (message != null && detail != null && detail.isNotEmpty) {
        return '$message: $detail';
      }
      if (message != null && message.isNotEmpty) {
        return message;
      }
      if (detail != null && detail.isNotEmpty) {
        return detail;
      }
    }

    return 'HTTP $statusCode';
  }
}
