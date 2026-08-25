import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

const String baseUrl = 'https://api-production-eff74.up.railway.app';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SafarDriverApp());
}

class SafarDriverApp extends StatelessWidget {
  const SafarDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SAFAR Driver',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF11151D),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF35D0B0),
          surface: Color(0xFF1E2530),
        ),
        fontFamily: 'Plus Jakarta Sans',
        useMaterial3: true,
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _loading = true;
  String? _token;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('safar_driver_token');
    if (token != null) {
      try {
        final res = await http.get(
          Uri.parse('$baseUrl/api/auth/me'),
          headers: {'Authorization': 'Bearer $token'},
        );
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          setState(() {
            _token = token;
            _user = data['data'];
            _loading = false;
          });
          return;
        }
      } catch (_) {}
    }
    setState(() {
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF35D0B0)),
        ),
      );
    }
    if (_token == null || _user == null) {
      return LoginScreen(onLoginSuccess: (token, user) {
        setState(() {
          _token = token;
          _user = user;
        });
      });
    }
    return DriverDashboard(token: _token!, user: _user!, onLogout: () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('safar_driver_token');
      setState(() {
        _token = null;
        _user = null;
      });
    });
  }
}

class LoginScreen extends StatefulWidget {
  final Function(String token, Map<String, dynamic> user) onLoginSuccess;
  const LoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController(text: 'driver@safar.com');
  final _passCtrl = TextEditingController(text: 'driver123');
  bool _submitting = false;
  String? _error;

  Future<void> _login() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailCtrl.text.trim(),
          'password': _passCtrl.text.trim(),
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 && data['success'] == true) {
        final token = data['data']['token'];
        final user = data['data']['user'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('safar_driver_token', token);
        widget.onLoginSuccess(token, user);
      } else {
        setState(() {
          _error = data['message'] ?? 'Login failed';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Connection error: $e';
      });
    } finally {
      setState(() {
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.local_taxi, size: 72, color: Color(0xFF35D0B0)),
              const SizedBox(height: 16),
              const Text(
                'SAFAR Driver',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const Text(
                'Native Android Driver Partner App',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white54, fontSize: 14),
              ),
              const SizedBox(height: 40),
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.redAccent.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                ),
              const SizedBox(height: 16),
              TextField(
                controller: _emailCtrl,
                decoration: InputDecoration(
                  labelText: 'Driver Email',
                  filled: true,
                  fillColor: const Color(0xFF1E2530),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  filled: true,
                  fillColor: const Color(0xFF1E2530),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submitting ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF35D0B0),
                  foregroundColor: const Color(0xFF11151D),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _submitting
                    ? const CircularProgressIndicator(color: Color(0xFF11151D))
                    : const Text('LOG IN AS DRIVER', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DriverDashboard extends StatefulWidget {
  final String token;
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const DriverDashboard({super.key, required this.token, required this.user, required this.onLogout});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  bool _isOnline = false;
  Map<String, dynamic>? _incomingRequest;
  Timer? _pollingTimer;
  Timer? _heartbeatTimer;
  io.Socket? _socket;

  @override
  void initState() {
    super.initState();
    _checkDriverOnlineStatus();
    _initSocket();
  }

  void _checkDriverOnlineStatus() {
    final driver = widget.user['driverProfile'];
    if (driver != null && driver['onlineStatus'] == 'ONLINE') {
      setState(() {
        _isOnline = true;
      });
      _startPollingAndHeartbeat();
    }
  }

  void _initSocket() {
    _socket = io.io(baseUrl, io.OptionBuilder().setTransports(['websocket', 'polling']).build());
    _socket?.onConnect((_) {
      final driverId = widget.user['driverProfile']?['id'];
      if (driverId != null) {
        _socket?.emit('register_driver', driverId);
      }
    });

    _socket?.on('ride_request_received', (data) {
      if (mounted) {
        setState(() {
          _incomingRequest = data;
        });
      }
    });
  }

  void _startPollingAndHeartbeat() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) => _pollActiveRideRequest());

    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (_) => _sendLocationUpdate());
  }

  void _stopPollingAndHeartbeat() {
    _pollingTimer?.cancel();
    _heartbeatTimer?.cancel();
  }

  Future<void> _pollActiveRideRequest() async {
    if (!_isOnline || _incomingRequest != null) return;
    try {
      final res = await http.get(
        Uri.parse('$baseUrl/api/rides/driver/active-request'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['data'] != null) {
          setState(() {
            _incomingRequest = data['data'];
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _sendLocationUpdate() async {
    if (!_isOnline) return;
    final driverId = widget.user['driverProfile']?['id'];
    if (driverId != null && _socket != null) {
      _socket?.emit('driver_location_update', {
        'driverId': driverId,
        'latitude': 28.6139,
        'longitude': 77.2090,
        'heading': 90,
        'speed': 30,
      });
    }
  }

  Future<void> _toggleOnline() async {
    final newStatus = !_isOnline;
    final endpoint = newStatus ? '/api/drivers/online' : '/api/drivers/offline';
    try {
      final res = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
        body: jsonEncode({'latitude': 28.6139, 'longitude': 77.2090}),
      );
      if (res.statusCode == 200) {
        setState(() {
          _isOnline = newStatus;
        });
        if (_isOnline) {
          _startPollingAndHeartbeat();
        } else {
          _stopPollingAndHeartbeat();
          setState(() {
            _incomingRequest = null;
          });
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status update error: $e')));
    }
  }

  Future<void> _acceptRide(String rideId) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/rides/$rideId/accept'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (res.statusCode == 200) {
        setState(() {
          _incomingRequest = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ride Accepted! Navigating to pickup...')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error accepting ride: $e')));
    }
  }

  @override
  void dispose() {
    _stopPollingAndHeartbeat();
    _socket?.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final driverName = widget.user['fullName'] ?? 'Driver Partner';

    return Scaffold(
      appBar: AppBar(
        title: Text(driverName, style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E2530),
        actions: [
          IconButton(
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout, color: Colors.redAccent),
          ),
        ],
      ),
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Online/Offline Status Switch
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E2530),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    children: [
                      GestureDetector(
                        onTap: _toggleOnline,
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isOnline ? const Color(0xFF35D0B0) : const Color(0xFF11151D),
                            border: Border.all(color: Colors.white, width: 4),
                            boxShadow: _isOnline
                                ? [const BoxShadow(color: Color(0xFF35D0B0), blurRadius: 30, spreadRadius: 5)]
                                : [],
                          ),
                          child: Icon(
                            Icons.power_settings_new,
                            size: 48,
                            color: _isOnline ? const Color(0xFF11151D) : Colors.white38,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: _isOnline ? const Color(0xFF35D0B0) : Colors.white54,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _isOnline ? 'Waiting for nearby ride requests...' : 'Tap power button to start accepting rides',
                        style: const TextStyle(color: Colors.white38, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Driver Performance Overview
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E2530),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Column(
                          children: [
                            Text('Today Earnings', style: TextStyle(color: Colors.white54, fontSize: 12)),
                            SizedBox(height: 4),
                            Text('₹1,450', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF35D0B0))),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E2530),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Column(
                          children: [
                            Text('Completed Rides', style: TextStyle(color: Colors.white54, fontSize: 12)),
                            SizedBox(height: 4),
                            Text('8 Rides', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Real-time Incoming Ride Request Overlay Modal
          if (_incomingRequest != null)
            Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                padding: const EdgeInsets.all(24),
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E2530),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: const Color(0xFF35D0B0), width: 2),
                  boxShadow: const [BoxShadow(color: Colors.black87, blurRadius: 30)],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('⚡ RIDE REQUEST', style: TextStyle(color: Color(0xFF35D0B0), fontWeight: FontWeight.black, fontSize: 18)),
                        Text('₹${_incomingRequest!['estimatedFare']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.black, fontSize: 24)),
                      ],
                    ),
                    const Divider(color: Colors.white10, height: 24),
                    ListTile(
                      leading: const Icon(Icons.circle, color: Color(0xFF35D0B0), size: 16),
                      title: const Text('Pickup Address', style: TextStyle(color: Colors.white54, fontSize: 12)),
                      subtitle: Text(_incomingRequest!['pickupAddress'] ?? 'Pickup Location', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                    ListTile(
                      leading: const Icon(Icons.location_on, color: Colors.redAccent, size: 20),
                      title: const Text('Destination', style: TextStyle(color: Colors.white54, fontSize: 12)),
                      subtitle: Text(_incomingRequest!['destinationAddress'] ?? 'Destination Location', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => setState(() => _incomingRequest = null),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white54,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              side: const BorderSide(color: Colors.white24),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            child: const Text('DECLINE'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => _acceptRide(_incomingRequest!['rideId']),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF35D0B0),
                              foregroundColor: const Color(0xFF11151D),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            child: const Text('ACCEPT RIDE', style: TextStyle(fontWeight: FontWeight.black)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
