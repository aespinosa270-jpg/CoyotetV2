import 'package:flutter/material.dart';
import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import 'models/product.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final dir = await getApplicationDocumentsDirectory();
  final isar = await Isar.open(
    [ProductSchema],
    directory: dir.path,
  );

  runApp(CoyoteApp(isar: isar));
}

class CoyoteApp extends StatelessWidget {
  final Isar isar;
  const CoyoteApp({Key? key, required this.isar}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Coyote Textil',
      theme: ThemeData.dark().copyWith(
        primaryColor: Colors.orange,
        scaffoldBackgroundColor: const Color(0xFF121212),
      ),
      home: CatalogScreen(isar: isar),
    );
  }
}

class CatalogScreen extends StatefulWidget {
  final Isar isar;
  const CatalogScreen({Key? key, required this.isar}) : super(key: key);

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  late ApiService apiService;
  List<Product> localProducts = [];
  bool isSyncing = false;

  @override
  void initState() {
    super.initState();
    apiService = ApiService(widget.isar);
    _loadLocalData();
  }

  Future<void> _loadLocalData() async {
    final products = await widget.isar.products.where().findAll();
    setState(() {
      localProducts = products;
    });
  }

  Future<void> _syncWithNextJs() async {
    setState(() => isSyncing = true);
    await apiService.syncCatalog();
    await _loadLocalData();
    setState(() => isSyncing = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Catálogo Coyote (Offline)'),
        actions: [
          IconButton(
            icon: isSyncing 
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
              : const Icon(Icons.sync),
            onPressed: isSyncing ? null : _syncWithNextJs,
          )
        ],
      ),
      body: localProducts.isEmpty
          ? const Center(child: Text("Toca el botón de arriba para sincronizar"))
          : ListView.builder(
              itemCount: localProducts.length,
              itemBuilder: (context, index) {
                final product = localProducts[index];
                return ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.inventory_2)),
                  title: Text(product.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("SKU: ${product.sku} | \$${product.priceMenudeo}"),
                );
              },
            ),
    );
  }
}