import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/errors/api_exception.dart';

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(error is ApiException ? error.message : error.toString()),
    ),
  );
}
