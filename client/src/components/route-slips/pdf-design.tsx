import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// ESTILOS RÉPLICA EXACTA DE H1.JPEG
const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontFamily: 'Helvetica', 
    fontSize: 8 
  },
  
  // Título Principal
  headerContainer: { alignItems: 'center', marginBottom: 15 },
  titleMain: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  titleSub: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  
  // Logo Circular (LINEA 2)
  topStamp: {
    position: 'absolute',
    top: 20,
    right: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topStampText: { color: '#FFF', fontSize: 7, fontWeight: 'bold', textAlign: 'center' },

  // Patente
  patenteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  patenteLabel: { fontSize: 10, fontWeight: 'bold', marginRight: 5 },
  patenteLine: { borderBottomWidth: 1, width: 200, textAlign: 'center', fontSize: 12, fontWeight: 'bold' },

  // Tablas Generales
  table: { width: '100%', borderWidth: 1, borderColor: '#000', marginBottom: -1 }, // overlap borders
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 14, alignItems: 'center' },
  lastRow: { borderBottomWidth: 0 },
  
  // Celdas
  headerCell: { 
    backgroundColor: '#e0e0e0', // Gris para títulos
    fontWeight: 'bold', 
    fontSize: 7, 
    padding: 2, 
    textAlign: 'center', 
    borderRightWidth: 1, 
    borderRightColor: '#000',
    height: '100%',
    justifyContent: 'center'
  },
  valueCell: {
    fontSize: 8,
    padding: 2,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000',
    height: '100%',
    justifyContent: 'center'
  },
  noBorder: { borderRightWidth: 0 },

  // Marca de Agua PAGADO
  watermark: {
    position: 'absolute',
    top: 300,
    left: 100,
    opacity: 0.2,
    transform: 'rotate(-45deg)'
  },
  watermarkText: { fontSize: 80, color: 'red', fontWeight: 'bold' }
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
  // Separar nombres para llenar las casillas exactas
  const splitName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length < 2) return { nombres: fullName, ap: '', am: '' };
    const am = parts.pop() || '';
    const ap = parts.pop() || '';
    const nombres = parts.join(' ');
    return { nombres, ap, am };
  };

  const driver = splitName(data.driverName);
  const owner = splitName(data.ownerName);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* TÍTULOS */}
        <View style={styles.headerContainer}>
          <Text style={styles.titleMain}>SISTEMA INTERNO DE CONTROL DIARIO</Text>
          <Text style={styles.titleSub}>Articulo 49 Bis, DS 212/92 - MTT</Text>
        </View>

        {/* LOGO */}
        <View style={styles.topStamp}>
          <Text style={styles.topStampText}>LINEA 2</Text>
          <Text style={styles.topStampText}>COPIAPÓ</Text>
        </View>

        {/* PATENTE */}
        <View style={styles.patenteRow}>
          <Text style={styles.patenteLabel}>PLACA PATENTE:</Text>
          <Text style={styles.patenteLine}>{data.vehiclePlate.toUpperCase()}</Text>
        </View>

        {/* TABLA 1: DATOS SERVICIO */}
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={{...styles.headerCell, width: '30%'}}>Nº LINEA</Text>
            <Text style={{...styles.headerCell, width: '40%'}}>COMUNA SERVICIO</Text>
            <Text style={{...styles.headerCell, width: '30%', borderRightWidth: 0}}>FOLIO SERVICIO</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.valueCell, width: '30%'}}>2</Text>
            <Text style={{...styles.valueCell, width: '40%'}}>COPIAPÓ</Text>
            <Text style={{...styles.valueCell, width: '30%', borderRightWidth: 0, color: 'red'}}>{data.id.slice(0,8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={{height: 5}}></View>

        {/* TABLA 2: CONDUCTOR */}
        <View style={styles.table}>
          <View style={{...styles.row, backgroundColor: '#e0e0e0', justifyContent: 'center'}}>
            <Text style={{fontSize: 7, fontWeight: 'bold'}}>CONDUCTOR</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.headerCell, width: '30%'}}>NOMBRES</Text>
            <Text style={{...styles.headerCell, width: '25%'}}>APELLIDO PATERNO</Text>
            <Text style={{...styles.headerCell, width: '25%'}}>APELLIDO MATERNO</Text>
            <Text style={{...styles.headerCell, width: '20%', borderRightWidth: 0}}>RUT</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.valueCell, width: '30%'}}>{driver.nombres.toUpperCase()}</Text>
            <Text style={{...styles.valueCell, width: '25%'}}>{driver.ap.toUpperCase()}</Text>
            <Text style={{...styles.valueCell, width: '25%'}}>{driver.am.toUpperCase()}</Text>
            <Text style={{...styles.valueCell, width: '20%', borderRightWidth: 0}}>{data.driverRut}</Text>
          </View>
        </View>

        <View style={{height: 5}}></View>

        {/* TABLA 3: LICENCIA */}
        <View style={styles.table}>
          <View style={{...styles.row, backgroundColor: '#e0e0e0', justifyContent: 'center'}}>
            <Text style={{fontSize: 7, fontWeight: 'bold'}}>LICENCIA CONDUCTOR</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.headerCell, width: '15%'}}>Nº</Text>
            <Text style={{...styles.headerCell, width: '15%'}}>CLASE</Text>
            <Text style={{...styles.headerCell, width: '35%'}}>FECHA PROX. CONTROL</Text>
            <Text style={{...styles.headerCell, width: '35%', borderRightWidth: 0}}>COMUNA</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.valueCell, width: '15%'}}>-</Text>
            <Text style={{...styles.valueCell, width: '15%'}}>A2</Text>
            <Text style={{...styles.valueCell, width: '35%'}}>-</Text>
            <Text style={{...styles.valueCell, width: '35%', borderRightWidth: 0}}>COPIAPÓ</Text>
          </View>
        </View>

        <View style={{height: 5}}></View>

        {/* TABLA 4: PROPIETARIO */}
        <View style={styles.table}>
          <View style={{...styles.row, backgroundColor: '#e0e0e0', justifyContent: 'center'}}>
            <Text style={{fontSize: 7, fontWeight: 'bold'}}>PROPIETARIO VEHICULO</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.headerCell, width: '30%'}}>NOMBRES</Text>
            <Text style={{...styles.headerCell, width: '25%'}}>APELLIDO PATERNO</Text>
            <Text style={{...styles.headerCell, width: '25%'}}>APELLIDO MATERNO</Text>
            <Text style={{...styles.headerCell, width: '20%', borderRightWidth: 0}}>RUT</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.valueCell, width: '30%'}}>{owner.nombres.toUpperCase()}</Text>
            <Text style={{...styles.valueCell, width: '25%'}}>{owner.ap.toUpperCase()}</Text>
            <Text style={{...styles.valueCell, width: '25%'}}>{owner.am.toUpperCase()}</Text>
            <Text style={{...styles.valueCell, width: '20%', borderRightWidth: 0}}>{data.ownerRut}</Text>
          </View>
        </View>

        <View style={{height: 5}}></View>

        {/* TABLA 5: DOCUMENTOS VEHÍCULO */}
        <View style={styles.table}>
          <View style={{...styles.row, backgroundColor: '#e0e0e0', justifyContent: 'center'}}>
            <Text style={{fontSize: 7, fontWeight: 'bold'}}>VEHICULO</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.headerCell, width: '25%'}}>REV. TÉCNICA</Text>
            <Text style={{...styles.headerCell, width: '25%'}}>PERM. CIRCULACIÓN</Text>
            <Text style={{...styles.headerCell, width: '25%'}}>SOAP</Text>
            <Text style={{...styles.headerCell, width: '25%', borderRightWidth: 0}}>CIRNSTP</Text>
          </View>
          <View style={{...styles.row, borderBottomWidth: 0}}>
            <Text style={{...styles.valueCell, width: '25%'}}>{data.technicalReview}</Text>
            <Text style={{...styles.valueCell, width: '25%'}}>{data.permCirculation}</Text>
            <Text style={{...styles.valueCell, width: '25%'}}>{data.soap}</Text>
            <Text style={{...styles.valueCell, width: '25%', borderRightWidth: 0}}>-</Text>
          </View>
        </View>

        <View style={{height: 10}}></View>

        {/* TABLA 6: CONTROL DIARIO (Horarios) */}
        <View style={styles.table}>
          <View style={{...styles.row, backgroundColor: '#e0e0e0', justifyContent: 'center'}}>
            <Text style={{fontSize: 7, fontWeight: 'bold'}}>CONTROL DIARIO</Text>
          </View>
          <View style={styles.row}>
            <Text style={{...styles.headerCell, width: '15%'}}>FECHA</Text>
            <Text style={{...styles.headerCell, width: '15%'}}>INICIO</Text>
            <Text style={{...styles.headerCell, width: '15%'}}>TERMINO</Text>
            <Text style={{...styles.headerCell, width: '55%', borderRightWidth: 0}}>FIRMA / TIMBRE CONTROLADOR</Text>
          </View>
          <View style={{...styles.row, minHeight: 40, borderBottomWidth: 0}}>
            <Text style={{...styles.valueCell, width: '15%'}}>{data.date}</Text>
            <Text style={{...styles.valueCell, width: '15%'}}>{data.startTime}</Text>
            <Text style={{...styles.valueCell, width: '15%'}}>{data.endTime}</Text>
            <View style={{width: '55%', alignItems: 'center', justifyContent: 'center'}}>
              {data.authorizedBy ? (
                <Text style={{fontSize: 8, color: 'blue', fontWeight: 'bold'}}>AUTORIZADO DIGITALMENTE</Text>
              ) : (
                <Text style={{fontSize: 8, color: '#ccc'}}>PENDIENTE</Text>
              )}
            </View>
          </View>
        </View>

        {/* MARCA DE AGUA */}
        {data.paymentStatus === 'paid' && (
             <View style={styles.watermark}>
                 <Text style={styles.watermarkText}>PAGADO</Text>
             </View>
        )}

      </Page>
    </Document>
  );
};