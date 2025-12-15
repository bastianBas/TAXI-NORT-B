import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Estilos estandarizados para formato A4
const styles = StyleSheet.create({
  page: { 
    flexDirection: 'column', 
    backgroundColor: '#FFFFFF', 
    padding: 40, 
    fontFamily: 'Helvetica',
    fontSize: 10 
  },
  
  // Encabezado Corporativo
  header: { 
    marginBottom: 20, 
    borderBottomWidth: 2, 
    borderBottomColor: '#111827', 
    paddingBottom: 10, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  companyInfo: { flexDirection: 'column' },
  companyTitle: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', color: '#111827' },
  companySub: { fontSize: 9, color: '#4B5563', marginTop: 1 },
  folioBox: { 
    borderWidth: 1, 
    borderColor: '#111827', 
    padding: 5, 
    alignItems: 'center', 
    minWidth: 100 
  },
  folioTitle: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  folioValue: { fontSize: 12, fontWeight: 'bold', color: '#DC2626' },

  // Título del Documento
  docTitleContainer: { 
    marginVertical: 15, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB', 
    paddingBottom: 15 
  },
  docTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  
  // Secciones de Datos
  section: { marginVertical: 8 },
  sectionTitle: { 
    fontSize: 9, 
    fontWeight: 'bold', 
    backgroundColor: '#F3F4F6', 
    padding: 4, 
    marginBottom: 5,
    textTransform: 'uppercase',
    color: '#374151'
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 130, fontWeight: 'bold', color: '#4B5563' },
  value: { flex: 1, color: '#111827' },

  // Timbre de "PAGADO" (Marca de agua simulada)
  stampContainer: { 
    position: 'absolute', 
    top: 200, 
    right: 150, 
    opacity: 0.25, 
    transform: 'rotate(-20deg)' 
  },
  stampCircle: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 4, 
    borderColor: '#059669', // Verde Esmeralda
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 10 
  },
  stampText: { color: '#059669', fontSize: 10, textAlign: 'center', fontWeight: 'bold' },
  stampBig: { color: '#059669', fontSize: 18, fontWeight: 'bold', marginVertical: 5 },

  // Área Legal (Pie de página)
  legalSection: { 
    marginTop: 'auto', 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  qrCode: { width: 70, height: 70 },
  signatureArea: { alignItems: 'center', width: 150 },
  signatureLine: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 5 },
  signatureText: { fontSize: 8, color: '#4B5563' },
  
  disclaimer: { fontSize: 7, color: '#9CA3AF', marginTop: 10, textAlign: 'center' }
});

export interface PdfData {
  id: string;
  date: string;
  driverName: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string;
  paymentStatus: string;
  authorizedBy?: string | null;
  qrData?: string | null;
}

export const RouteSlipPdf = ({ data }: { data: PdfData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* 1. Encabezado Corporativo */}
      <View style={styles.header}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyTitle}>TAXI NORT S.A.</Text>
          <Text style={styles.companySub}>RUT: 76.123.456-K</Text>
          <Text style={styles.companySub}>GIRO: TRANSPORTE DE PASAJEROS</Text>
          <Text style={styles.companySub}>DIRECCIÓN: COPIAPÓ, REGIÓN DE ATACAMA</Text>
          <Text style={styles.companySub}>CONTACTO: contacto@taxinort.cl</Text>
        </View>
        
        <View style={styles.folioBox}>
          <Text style={styles.folioTitle}>FOLIO INTERNO</Text>
          <Text style={styles.folioValue}>#{data.id.slice(0, 6).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.docTitleContainer}>
        <Text style={styles.docTitle}>HOJA DE RUTA Y CONTROL DIARIO</Text>
      </View>

      {/* 2. Timbre de Pagado (Solo si corresponde) */}
      {data.paymentStatus === 'paid' && (
        <View style={styles.stampContainer}>
          <View style={styles.stampCircle}>
            <Text style={styles.stampText}>TAXI NORT S.A.</Text>
            <Text style={styles.stampBig}>PAGADO</Text>
            <Text style={styles.stampText}>{data.date}</Text>
            <Text style={{...styles.stampText, fontSize: 8, marginTop: 2}}>TESORERÍA</Text>
          </View>
        </View>
      )}

      {/* 3. Datos del Conductor y Vehículo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>IDENTIFICACIÓN DEL SERVICIO</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>CONDUCTOR:</Text>
          <Text style={styles.value}>{data.driverName.toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VEHÍCULO (PATENTE):</Text>
          <Text style={styles.value}>{data.vehiclePlate.toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>FECHA OPERACIÓN:</Text>
          <Text style={styles.value}>{data.date}</Text>
        </View>
      </View>

      {/* 4. Tiempos y Jornada */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTROL DE JORNADA</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>HORA INICIO:</Text>
          <Text style={styles.value}>{data.startTime}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>HORA TÉRMINO:</Text>
          <Text style={styles.value}>{data.endTime}</Text>
        </View>
      </View>

      {/* 5. Estado Financiero */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ESTADO FINANCIERO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>ESTADO:</Text>
          <Text style={{ ...styles.value, color: data.paymentStatus === 'paid' ? '#059669' : '#D97706', fontWeight: 'bold' }}>
            {data.paymentStatus === 'paid' ? 'DOCUMENTO PAGADO' : 'PENDIENTE DE PAGO'}
          </Text>
        </View>
      </View>

      {/* 6. Sección Legal (QR y Firmas) */}
      <View style={styles.legalSection}>
        
        {/* Código QR (Generado vía API pública para demostración) */}
        <View>
            {data.qrData ? (
                <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.qrData)}`} 
                    style={styles.qrCode}
                />
            ) : (
                <View style={{...styles.qrCode, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'}}>
                    <Text style={{fontSize: 6, color: '#9CA3AF'}}>QR NO DISPONIBLE</Text>
                </View>
            )}
            <Text style={{fontSize: 6, marginTop: 4}}>VALIDACIÓN DIGITAL</Text>
        </View>

        {/* Firma Gerencia */}
        <View style={styles.signatureArea}>
            <View style={styles.signatureLine} />
            <Text style={{...styles.signatureText, fontWeight: 'bold'}}>V°B° GERENCIA</Text>
            <Text style={styles.signatureText}>TAXI NORT S.A.</Text>
            {data.authorizedBy && <Text style={{fontSize: 6, color: '#059669', marginTop: 2}}>FIRMADO DIGITALMENTE</Text>}
        </View>

      </View>

      <Text style={styles.disclaimer}>
        Este documento es un comprobante interno de operación y pago de hoja de ruta. 
        Válido ante fiscalización interna y control de flota. 
        Generado electrónicamente el {new Date().toLocaleString()}.
      </Text>

    </Page>
  </Document>
);