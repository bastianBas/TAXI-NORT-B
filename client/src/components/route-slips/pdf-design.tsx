import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Estilos modernos y limpios (Basado en image_91079d.png)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica', // Fuente limpia estándar
  },
  
  // Encabezado
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#111827', // Negro suave
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
    color: '#6B7280', // Gris medio
  },

  // Bloques de datos (Tarjetas grises)
  section: {
    backgroundColor: '#F9FAFB', // Gris muy claro de fondo
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
  },
  
  // Filas de datos
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
    color: '#374151', // Gris oscuro
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#111827', // Casi negro
  },

  // Estilos especiales
  statusPaid: {
    color: '#059669', // Verde éxito
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusPending: {
    color: '#D97706', // Ámbar advertencia
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  
  // Pie de página
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

// Interfaz de datos (La misma que usas en el backend)
export interface PdfData {
  id: string;
  date: string;
  driverName: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  paymentStatus: string;
  // Estos campos opcionales no se usan visualmente en este diseño simple, 
  // pero los dejamos para que no de error TypeScript si vienen del backend.
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

      {/* 2. Datos Generales (Bloque Gris 1) */}
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

      {/* 3. Horarios (Bloque Gris 2) */}
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

      {/* 4. Estado y Firma (Bloque Gris 3) */}
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
            {data.paymentStatus === 'paid' ? 'FIRMADO DIGITALMENTE' : 'PENDIENTE DE FIRMA'}
          </Text>
        </View>
      </View>

      {/* Pie de Página */}
      <Text style={styles.footer}>
        Documento generado electrónicamente por TaxiNort App. 
        Este comprobante valida la operación diaria del vehículo indicado.
      </Text>

    </Page>
  </Document>
);