import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Estilos modernos y limpios (Basado en tu imagen de bloques grises)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  
  // Encabezado
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Bloques de datos (Tarjetas grises)
  section: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
  },
  
  // Filas
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  
  // Etiquetas y Valores
  label: {
    width: 100,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#111827',
  },

  // Estado
  statusPaid: { color: '#059669', fontWeight: 'bold', textTransform: 'uppercase' },
  statusPending: { color: '#D97706', fontWeight: 'bold', textTransform: 'uppercase' },
  
  // Pie
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  }
});

export interface PdfData {
  id: string;
  date: string;
  driverName: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  paymentStatus: string;
  // Campos opcionales para compatibilidad
  driverRut?: string;
  ownerName?: string;
  authorizedBy?: string | null;
}

export const RouteSlipPdf = ({ data }: { data: PdfData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* 1. Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>TAXI NORT - CONTROL DIARIO</Text>
        <Text style={styles.subtitle}>Comprobante de operación interno</Text>
      </View>

      {/* 2. Datos Generales */}
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
          <Text style={styles.value}>{data.vehiclePlate.toUpperCase()}</Text>
        </View>
      </View>

      {/* 3. Horarios */}
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

      {/* 4. Estado */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Estado Pago:</Text>
          <Text style={data.paymentStatus === 'paid' ? styles.statusPaid : styles.statusPending}>
            {data.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Firma:</Text>
          <Text style={styles.value}>
            {data.paymentStatus === 'paid' ? 'FIRMADO DIGITALMENTE' : 'PENDIENTE'}
          </Text>
        </View>
      </View>

      {/* Pie de Página */}
      <Text style={styles.footer}>
        Documento generado electrónicamente por TaxiNort App.
      </Text>

    </Page>
  </Document>
);