import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

const String baseUrl = 'https://api-production-eff74.up.railway.app';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SafarAdminApp());
}

class SafarAdminApp extends StatelessWidget {
  const SafarAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SAFAR Admin',
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
    final token = prefs.getString('safar_admin_token');
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
    return AdminDashboard(token: _token!, user: _user!, onLogout: () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('safar_admin_token');
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
  final _emailCtrl = TextEditingController(text: 'admin@safar.com');
  final _passCtrl = TextEditingController(text: 'admin123');
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
        await prefs.setString('safar_admin_token', token);
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
              const Icon(Icons.admin_panel_settings, size: 72, color: Color(0xFF35D0B0)),
              const SizedBox(height: 16),
              const Text(
                'SAFAR Admin Console',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const Text(
                'Native Android Operations Portal',
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
                  labelText: 'Admin Email',
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
                    : const Text('LOG IN TO CONSOLE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AdminDashboard extends StatefulWidget {
  final String token;
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const AdminDashboard({super.key, required this.token, required this.user, required this.onLogout});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  Map<String, dynamic>? _stats;
  List<dynamic> _drivers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchDashboardData();
  }

  Future<void> _fetchDashboardData() async {
    try {
      final statsRes = await http.get(
        Uri.parse('$baseUrl/api/admin/dashboard'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      final driversRes = await http.get(
        Uri.parse('$baseUrl/api/admin/drivers'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );

      if (statsRes.statusCode == 200 && driversRes.statusCode == 200) {
        setState(() {
          _stats = jsonDecode(statsRes.body)['data'];
          _drivers = jsonDecode(driversRes.body)['data'] ?? [];
          _loading = false;
        });
      }
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SAFAR Admin Operations', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: const Color(0xFF1E2530),
        actions: [
          IconButton(
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout, color: Colors.redAccent),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF35D0B0)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Operational Metrics Cards
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E2530),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Column(
                            children: [
                              const Text('Total Riders', style: TextStyle(color: Colors.white54, fontSize: 12)),
                              const SizedBox(height: 4),
                              Text('${_stats?['totalRiders'] ?? 0}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E2530),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Column(
                            children: [
                              const Text('Total Drivers', style: TextStyle(color: Colors.white54, fontSize: 12)),
                              const SizedBox(height: 4),
                              Text('${_stats?['totalDrivers'] ?? 0}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF35D0B0))),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Fleet Live Map Header
                  const Text('FLEET MANAGEMENT', style: TextStyle(color: Colors.white54, fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 200,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: FlutterMap(
                        options: const MapOptions(
                          initialCenter: LatLng(28.6139, 77.2090),
                          initialZoom: 12.0,
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'app.safar.admin',
                          ),
                          const MarkerLayer(
                            markers: [
                              Marker(
                                point: LatLng(28.6139, 77.2090),
                                child: Icon(Icons.local_taxi, color: Color(0xFF35D0B0), size: 30),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Registered Drivers & KYC Verification Queue
                  const Text('REGISTERED DRIVER PARTNERS', style: TextStyle(color: Colors.white54, fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 8),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _drivers.length,
                    itemBuilder: (context, idx) {
                      final d = _drivers[idx];
                      final name = d['user']?['fullName'] ?? 'Driver Partner';
                      final phone = d['user']?['phone'] ?? 'N/A';
                      final kycStatus = d['kycStatus'] ?? 'PENDING';
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E2530),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                Text(phone, style: const TextStyle(color: Colors.white54, fontSize: 12)),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: kycStatus == 'APPROVED' ? Colors.green.withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                kycStatus,
                                style: TextStyle(
                                  color: kycStatus == 'APPROVED' ? Colors.greenAccent : Colors.amberAccent,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
    );
  }
}
