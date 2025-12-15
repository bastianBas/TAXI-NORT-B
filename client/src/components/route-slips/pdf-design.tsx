import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { 
    padding: 20, 
    fontFamily: 'Helvetica', 
    fontSize: 8 
  },
  
  // --- TÍTULOS SUPERIORES ---
  headerContainer: { alignItems: 'center', marginBottom: 10 },
  titleMain: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  titleSub: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  
  // Logo superior derecha (Simulado como H1.jpeg)
  topStamp: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    borderWidth: 2,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  topStampText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },

  // --- ESTRUCTURA DE TABLAS ---
  tableContainer: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#000', 
    marginBottom: 5 
  },
  row: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#000', 
    alignItems: 'center',
    minHeight: 16
  },
  
  // Celdas
  cellLabel: { 
    backgroundColor: '#e5e5e5', 
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#000',
    fontWeight: 'bold',
    fontSize: 7,
    textAlign: 'center',
    height: '100%',
    justifyContent: 'center'
  },
  cellValue: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#000',
    fontSize: 8,
    textAlign: 'center',
    height: '100%',
    justifyContent: 'center'
  },

  // Sección especial Patente
  patenteRow: { flexDirection: 'row', marginBottom: 10, marginTop: 10, alignItems: 'center' },
  patenteLabel: { fontSize: 12, fontWeight: 'bold', marginRight: 5 },
  patenteLine: { borderBottomWidth: 1, width: 200, textAlign: 'center', fontSize: 14, fontWeight: 'bold' },

  // Timbre Grande "PAGADO"
  watermark: {
    position: 'absolute',
    top: 350,
    left: 150,
    opacity: 0.3,
    transform: 'rotate(-30deg)'
  },
  watermarkText: { fontSize: 60, color: 'red', fontWeight: 'bold' }
});

export interface PdfData {
  id: string;
  date: string;
  driverName: string;
  driverRut: string;
  vehiclePlate: string;
  ownerName: string;
  ownerRut: string;
  technicalReview: string;
  permCirculation: string;
  soap: string;
  paymentStatus: string;
  authorizedBy: string | null;
  startTime: string;
  endTime: string;
}

export const RouteSlipPdf = ({ data }: { data: PdfData }) => {
  // Función para separar nombres (Simulación para llenar casillas)
  const splitName = (fullName: string) => {
    const parts = fullName.split(' ');
    const apellidoM = parts.length > 1 ? parts.pop() : '';
    const apellidoP = parts.length > 1 ? parts.pop() : '';
    const nombres = parts.join(' ');
    return { nombres, apellidoP, apellidoM };
  };

  const driverParts = splitName(data.driverName);
  const ownerParts = splitName(data.ownerName);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* --- ENCABEZADO LEGAL H1 --- */}
        <View style={styles.headerContainer}>
          <Text style={styles.titleMain}>SISTEMA INTERNO DE CONTROL DIARIO</Text>
          <Text style={styles.titleSub}>Articulo 49 Bis, DS 212/92 - MTT</Text>
        </View>

        {/* LOGO CIRCULAR NEGRO */}
        <View style={styles.topStamp}>
          <Text style={styles.topStampText}>LINEA 2</Text>
          <Text style={styles.topStampText}>COPIAPÓ</Text>
        </View>

        {/* --- PLACA PATENTE --- */}
        <View style={styles.patenteRow}>
          <Text style={styles.patenteLabel}>PLACA PATENTE:</Text>
          <Text style={styles.patenteLine}>{data.vehiclePlate.toUpperCase()}</Text>
        </View>

        {/* --- BLOQUE 1: DATOS GENERALES --- */}
        <View style={styles.tableContainer}>
          <View style={styles.row}>
            <Text style={{...styles.cellLabel, width: '30%'}}>Nº LINEA</Text>
            <Text style={{...styles.cellLabel, width: '40%'}}>COMUNA SERVICIO</Text>
            <Text style={{...styles.cellLabel, width: '30%', borderRightWidth: 0}}>FOLIO SERVICIO</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.cellValue, width: '30%'}}>2</Text>
            <Text style={{...styles.cellValue, width: '40%'}}>COPIAPÓ</Text>
            <Text style={{...styles.cellValue, width: '30%', borderRightWidth: 0, color: 'red', fontWeight: 'bold'}}>{data.id.slice(0,8).toUpperCase()}</Text>
          </View>
        </View>

        {/* --- BLOQUE 2: CONDUCTOR --- */}
        <View style={styles.tableContainer}>
          <View style={{...styles.row, backgroundColor: '#e5e5e5', justifyContent: 'center'}}>
            <Text style={{fontSize: 8, fontWeight: 'bold'}}>CONDUCTOR</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.cellLabel, width: '30%'}}>NOMBRES</Text>
            <Text style={{...styles.cellLabel, width: '25%'}}>APELLIDO PATERNO</Text>
            <Text style={{...styles.cellLabel, width: '25%'}}>APELLIDO MATERNO</Text>
            <Text style={{...styles.cellLabel, width: '20%', borderRightWidth: 0}}>RUT</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.cellValue, width: '30%'}}>{driverParts.nombres.toUpperCase()}</Text>
            <Text style={{...styles.cellValue, width: '25%'}}>{driverParts.apellidoP?.toUpperCase()}</Text>
            <Text style={{...styles.cellValue, width: '25%'}}>{driverParts.apellidoM?.toUpperCase()}</Text>
            <Text style={{...styles.cellValue, width: '20%', borderRightWidth: 0}}>{data.driverRut}</Text>
          </View>
        </View>

        {/* --- BLOQUE 3: LICENCIA --- */}
        <View style={styles.tableContainer}>
          <View style={{...styles.row, backgroundColor: '#e5e5e5', justifyContent: 'center'}}>
            <Text style={{fontSize: 8, fontWeight: 'bold'}}>LICENCIA CONDUCTOR</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.cellLabel, width: '20%'}}>Nº</Text>
            <Text style={{...styles.cellLabel, width: '10%'}}>CLASE</Text>
            <Text style={{...styles.cellLabel, width: '30%'}}>FECHA PROX. CONTROL</Text>
            <Text style={{...styles.cellLabel, width: '40%', borderRightWidth: 0}}>COMUNA</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.cellValue, width: '20%'}}>[Nº]</Text>
            <Text style={{...styles.cellValue, width: '10%'}}>[A2]</Text>
            <Text style={{...styles.cellValue, width: '30%'}}>[FECHA]</Text>
            <Text style={{...styles.cellValue, width: '40%', borderRightWidth: 0}}>COPIAPÓ</Text>
          </View>
        </View>

        {/* --- BLOQUE 4: PROPIETARIO --- */}
        <View style={styles.tableContainer}>
          <View style={{...styles.row, backgroundColor: '#e5e5e5', justifyContent: 'center'}}>
            <Text style={{fontSize: 8, fontWeight: 'bold'}}>PROPIETARIO VEHICULO</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.cellLabel, width: '30%'}}>NOMBRES</Text>
            <Text style={{...styles.cellLabel, width: '25%'}}>APELLIDO PATERNO</Text>
            <Text style={{...styles.cellLabel, width: '25%'}}>APELLIDO MATERNO</Text>
            <Text style={{...styles.cellLabel, width: '20%', borderRightWidth: 0}}>RUT</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.cellValue, width: '30%'}}>{ownerParts.nombres.toUpperCase()}</Text>
            <Text style={{...styles.cellValue, width: '25%'}}>{ownerParts.apellidoP?.toUpperCase()}</Text>
            <Text style={{...styles.cellValue, width: '25%'}}>{ownerParts.apellidoM?.toUpperCase()}</Text>
            <Text style={{...styles.cellValue, width: '20%', borderRightWidth: 0}}>{data.ownerRut}</Text>
          </View>
        </View>

         {/* --- BLOQUE 5: VEHÍCULO --- */}
         <View style={styles.tableContainer}>
          <View style={{...styles.row, backgroundColor: '#e5e5e5', justifyContent: 'center'}}>
            <Text style={{fontSize: 8, fontWeight: 'bold'}}>VEHICULO</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.cellLabel, width: '25%'}}>REV. TÉCNICA</Text>
            <Text style={{...styles.cellLabel, width: '25%'}}>PERM. CIRCULACIÓN</Text>
            <Text style={{...styles.cellLabel, width: '25%'}}>SOAP</Text>
            <Text style={{...styles.cellLabel, width: '25%', borderRightWidth: 0}}>CIRNSTP</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.cellLabel, width: '25%', fontSize: 6}}>VENCIMIENTO</Text>
            <Text style={{...styles.cellLabel, width: '25%', fontSize: 6}}>VENCIMIENTO</Text>
            <Text style={{...styles.cellLabel, width: '25%', fontSize: 6}}>VENCIMIENTO</Text>
            <Text style={{...styles.cellLabel, width: '25%', fontSize: 6, borderRightWidth: 0}}>VENCIMIENTO</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.cellValue, width: '25%'}}>{data.technicalReview}</Text>
            <Text style={{...styles.cellValue, width: '25%'}}>{data.permCirculation}</Text>
            <Text style={{...styles.cellValue, width: '25%'}}>{data.soap}</Text>
            <Text style={{...styles.cellValue, width: '25%', borderRightWidth: 0}}>[FECHA]</Text>
          </View>
        </View>

        {/* --- BLOQUE CONTROL DIARIO (Foto H2) --- */}
        <View style={{...styles.tableContainer, marginTop: 10}}>
             <View style={{...styles.row, backgroundColor: '#e5e5e5', justifyContent: 'center'}}>
                <Text style={{fontSize: 8, fontWeight: 'bold'}}>CONTROL DIARIO</Text>
             </View>
             <View style={styles.row}>
                <Text style={{...styles.cellLabel, width: '15%'}}>FECHA</Text>
                <Text style={{...styles.cellLabel, width: '20%'}}>HORA INICIO</Text>
                <Text style={{...styles.cellLabel, width: '20%'}}>HORA TERMINO</Text>
                <Text style={{...styles.cellLabel, width: '45%', borderRightWidth: 0}}>FIRMA / TIMBRE CONTROLADOR</Text>
             </View>
             <View style={{...styles.row, minHeight: 40, borderBottomWidth: 0}}>
                <Text style={{...styles.cellValue, width: '15%'}}>{data.date}</Text>
                <Text style={{...styles.cellValue, width: '20%'}}>{data.startTime}</Text>
                <Text style={{...styles.cellValue, width: '20%'}}>{data.endTime}</Text>
                <View style={{width: '45%', alignItems: 'center', justifyContent: 'center'}}>
                    {data.authorizedBy ? (
                         <Text style={{color: 'blue', fontSize: 8}}>AUTORIZADO DIGITALMENTE</Text>
                    ) : (
                         <Text style={{color: '#ccc'}}>PENDIENTE</Text>
                    )}
                </View>
             </View>
        </View>

        {/* TIMBRE PAGADO (Si corresponde) */}
        {data.paymentStatus === 'paid' && (
             <View style={styles.watermark}>
                 <Text style={styles.watermarkText}>PAGADO</Text>
             </View>
        )}

      </Page>
    </Document>
  );
};