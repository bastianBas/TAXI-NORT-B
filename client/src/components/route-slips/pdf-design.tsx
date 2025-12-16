import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 30 },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#111827', paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' },
  subtitle: { fontSize: 10, color: '#6B7280', marginTop: 5 },
  section: { marginVertical: 10, padding: 15, backgroundColor: '#F9FAFB', borderRadius: 5 },
  row: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  label: { width: 100, fontSize: 10, fontWeight: 'bold', color: '#374151' },
  value: { fontSize: 12, color: '#111827', flex: 1 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 },
  footerText: { fontSize: 8, color: '#9CA3AF' }
});

// 👇 IMPORTANTE: id es string aquí
export interface PdfData {
  id: string;
  date: string;
  driverName: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  paymentStatus: string;
  firma: string | null;
}

export const RouteSlipPdf = ({ data }: { data: PdfData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>TAXI NORT - CONTROL DIARIO</Text>
        <Text style={styles.subtitle}>Comprobante de operación interno</Text>
      </View>

      {/* Datos del Servicio */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>ID Registro:</Text>
          <Text style={styles.value}>#{data.id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>{data.date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Conductor:</Text>
          <Text style={styles.value}>{data.driverName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Vehículo:</Text>
          <Text style={styles.value}>{data.vehiclePlate}</Text>
        </View>
      </View>

      {/* Tiempos */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Inicio:</Text>
          <Text style={styles.value}>{data.startTime}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fin:</Text>
          <Text style={styles.value}>{data.endTime}</Text>
        </View>
      </View>

      {/* Estado */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Estado Pago:</Text>
          <Text style={{ ...styles.value, color: data.paymentStatus === 'paid' ? 'green' : '#D97706' }}>
            {data.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Firma:</Text>
          <Text style={styles.value}>{data.firma ? "FIRMADO" : "SIN FIRMA"}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Documento generado localmente. Sin validez fiscal externa.
        </Text>
      </View>
    </Page>
  </Document>
);