import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Estilos del PDF (Diseño Industrial/Limpio)
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2px solid #FDCB02', paddingBottom: 20, marginBottom: 30 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#000000', letterSpacing: 2 },
  logoSub: { fontSize: 10, color: '#666666', marginTop: 4, letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000000', textAlign: 'right' },
  subtitle: { fontSize: 10, color: '#666666', textAlign: 'right', marginTop: 4 },
  
  section: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  box: { width: '45%' },
  boxTitle: { fontSize: 10, fontWeight: 'bold', color: '#000000', marginBottom: 8, textTransform: 'uppercase', backgroundColor: '#f4f4f5', padding: 4 },
  text: { fontSize: 10, color: '#3f3f46', marginBottom: 4, lineHeight: 1.4 },
  textBold: { fontWeight: 'bold', color: '#000000' },

  table: { width: '100%', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', borderBottom: '1px solid #000', paddingBottom: 5, marginBottom: 5 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e4e4e7', paddingVertical: 8 },
  col1: { width: '15%', fontSize: 10, textAlign: 'center' },
  col2: { width: '45%', fontSize: 10 },
  col3: { width: '20%', fontSize: 10, textAlign: 'right' },
  col4: { width: '20%', fontSize: 10, textAlign: 'right', fontWeight: 'bold' },
  
  totalsBox: { width: '40%', alignSelf: 'flex-end', borderTop: '2px solid #000', paddingTop: 10 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totLabel: { fontSize: 10, color: '#666666', textTransform: 'uppercase' },
  totValue: { fontSize: 10, fontWeight: 'bold', color: '#000000' },
  granTotal: { fontSize: 14, fontWeight: 'bold', color: '#000000' },

  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, borderTop: '1px solid #e4e4e7', paddingTop: 10 },
  footerText: { fontSize: 8, color: '#a1a1aa', textAlign: 'center' }
});

const fmt = (v: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);

export default function CotizacionPDF({ 
  cliente, partidas, subtotal, iva, total, folio 
}: { 
  cliente: any, partidas: any[], subtotal: number, iva: number, total: number, folio: string 
}) {
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoText}>COYOTE TEXTIL</Text>
            <Text style={styles.logoSub}>S.A. DE C.V.</Text>
          </View>
          <View>
            <Text style={styles.title}>COTIZACIÓN</Text>
            <Text style={styles.subtitle}>Folio: #{folio}</Text>
            <Text style={styles.subtitle}>Fecha: {fecha}</Text>
          </View>
        </View>

        {/* INFO CLIENTE Y EMISOR */}
        <View style={styles.section}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Preparado Para:</Text>
            <Text style={styles.text}><Text style={styles.textBold}>{cliente?.company || cliente?.name || 'Cliente Mostrador'}</Text></Text>
            <Text style={styles.text}>Atn: {cliente?.name || '—'}</Text>
            <Text style={styles.text}>RFC: {cliente?.rfc || 'Público General'}</Text>
            <Text style={styles.text}>{cliente?.email || ''}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Emitido Por:</Text>
            <Text style={styles.text}><Text style={styles.textBold}>Coyote Textil</Text></Text>
            <Text style={styles.text}>Plomo #203 / Guatemala #97</Text>
            <Text style={styles.text}>ventas@coyotetextil.com</Text>
          </View>
        </View>

        {/* TABLA DE PARTIDAS */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>CANTIDAD</Text>
            <Text style={styles.col2}>DESCRIPCIÓN</Text>
            <Text style={styles.col3}>P. UNITARIO</Text>
            <Text style={styles.col4}>IMPORTE</Text>
          </View>
          {partidas.filter(p => p.productId).map((p, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{p.quantity}</Text>
              <Text style={styles.col2}>{p.title || 'Producto Textil'}</Text>
              <Text style={styles.col3}>{fmt(p.unitPrice)}</Text>
              <Text style={styles.col4}>{fmt(p.quantity * p.unitPrice)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALES */}
        <View style={styles.totalsBox}>
          <View style={styles.totRow}>
            <Text style={styles.totLabel}>Subtotal:</Text>
            <Text style={styles.totValue}>{fmt(subtotal)}</Text>
          </View>
          {iva > 0 && (
            <View style={styles.totRow}>
              <Text style={styles.totLabel}>IVA (16%):</Text>
              <Text style={styles.totValue}>{fmt(iva)}</Text>
            </View>
          )}
          <View style={[styles.totRow, { marginTop: 10 }]}>
            <Text style={[styles.totLabel, { color: '#000', fontWeight: 'bold' }]}>Gran Total:</Text>
            <Text style={styles.granTotal}>{fmt(total)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Los precios expresados en esta cotización están sujetos a cambios sin previo aviso.</Text>
          <Text style={styles.footerText}>Vigencia de la cotización: 15 días a partir de la fecha de emisión.</Text>
        </View>

      </Page>
    </Document>
  );
}