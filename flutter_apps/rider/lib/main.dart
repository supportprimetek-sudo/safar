import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

const String baseUrl = 'https://api-production-eff74.up.railway.app';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SafarRiderApp());
}

class SafarRiderApp extends StatelessWidget {
  const SafarRiderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SAFAR Rider',
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
    final token = prefs.getString('safar_rider_token');
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
    return HomeScreen(token: _token!, user: _user!, onLogout: () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('safar_rider_token');
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
  final _emailCtrl = TextEditingController(text: 'rider@safar.com');
  final _passCtrl = TextEditingController(text: 'rider123');
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
        await prefs.setString('safar_rider_token', token);
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
              const Icon(Icons.directions_car_filled, size: 72, color: Color(0xFF35D0B0)),
              const SizedBox(height: 16),
              const Text(
                'SAFAR Rider',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const Text(
                'Native Android Ride Hailing App',
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
                  labelText: 'Email Address',
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
                    : const Text('LOG IN TO RIDE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  final String token;
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const HomeScreen({super.key, required this.token, required this.user, required this.onLogout});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _pickupCtrl = TextEditingController(text: 'Connaught Place, New Delhi');
  final _destCtrl = TextEditingController(text: 'India Gate, New Delhi');
  LatLng _pickupPos = const LatLng(28.6315, 77.2167);
  LatLng _destPos = const LatLng(28.6129, 77.2295);

  List<dynamic> _vehicles = [];
  String? _selectedVehicleId;
  int _estimatedFare = 120;
  bool _booking = false;
  Map<String, dynamic>? _activeRide;
  io.Socket? _socket;

  @override
  void initState() {
    super.initState();
    _fetchVehicles();
    _initSocket();
  }

  void _initSocket() {
    _socket = io.io(baseUrl, io.OptionBuilder().setTransports(['websocket', 'polling']).build());
    _socket?.onConnect((_) {
      _socket?.emit('register_user', widget.user['id']);
    });
    _socket?.on('ride_accepted', (data) {
      if (mounted) {
        setState(() {
          _activeRide = data;
        });
      }
    });
  }

  @override
  void dispose() {
    _socket?.disconnect();
    super.dispose();
  }

  Future<void> _fetchVehicles() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/vehicles'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _vehicles = data['data'] ?? [];
          if (_vehicles.isNotEmpty) {
            _selectedVehicleId = _vehicles[0]['id'];
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _bookRide() async {
    if (_selectedVehicleId == null) return;
    setState(() {
      _booking = true;
    });
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/rides'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
        body: jsonEncode({
          'vehicleTypeId': _selectedVehicleId,
          'pickupAddress': _pickupCtrl.text,
          'pickupLatitude': _pickupPos.latitude,
          'pickupLongitude': _pickupPos.longitude,
          'destinationAddress': _destCtrl.text,
          'destinationLatitude': _destPos.latitude,
          'destinationLongitude': _destPos.longitude,
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 201 && data['success'] == true) {
        setState(() {
          _activeRide = data['data'];
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? 'Booking failed')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() {
        _booking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Flutter Native Interactive Map Engine
          FlutterMap(
            options: MapOptions(
              initialCenter: _pickupPos,
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'app.safar.rider',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _pickupPos,
                    child: const Icon(Icons.my_location, color: Color(0xFF35D0B0), size: 36),
                  ),
                  Marker(
                    point: _destPos,
                    child: const Icon(Icons.location_on, color: Colors.redAccent, size: 36),
                  ),
                ],
              ),
            ],
          ),

          // Top App Header
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E2530),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: Color(0xFF35D0B0),
                          radius: 16,
                          child: Icon(Icons.person, color: Color(0xFF11151D), size: 20),
                        ),
                        const SizedBox(width: 8),
                        Text(widget.user['fullName'] ?? 'Rider', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: widget.onLogout,
                    icon: const Icon(Icons.logout, color: Colors.redAccent),
                    style: IconButton.styleFrom(backgroundColor: const Color(0xFF1E2530)),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Ride Booking Sheet
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Color(0xFF1E2530),
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 20)],
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _pickupCtrl,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.circle, color: Color(0xFF35D0B0), size: 16),
                        labelText: 'Pickup Location',
                        filled: true,
                        fillColor: const Color(0xFF11151D),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _destCtrl,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.location_on, color: Colors.redAccent, size: 20),
                        labelText: 'Destination',
                        filled: true,
                        fillColor: const Color(0xFF11151D),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 90,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _vehicles.length,
                        itemBuilder: (context, idx) {
                          final v = _vehicles[idx];
                          final isSelected = v['id'] == _selectedVehicleId;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedVehicleId = v['id']),
                            child: Container(
                              margin: const EdgeInsets.only(right: 12),
                              padding: const EdgeInsets.all(12),
                              width: 110,
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF35D0B0).withOpacity(0.2) : const Color(0xFF11151D),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF35D0B0) : Colors.white10,
                                  width: 2,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.directions_car, color: Colors.white),
                                  const SizedBox(height: 4),
                                  Text(v['name'] ?? 'Car', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  Text('₹${v['baseFare'] ?? 100}', style: const TextStyle(color: Color(0xFF35D0B0), fontSize: 12)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _booking ? null : _bookRide,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF35D0B0),
                        foregroundColor: const Color(0xFF11151D),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        minimumSize: const Size.fromHeight(54),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _booking
                          ? const CircularProgressIndicator(color: Color(0xFF11151D))
                          : const Text('CONFIRM SAFAR RIDE', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
