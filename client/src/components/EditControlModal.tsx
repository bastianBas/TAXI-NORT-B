import React, { useState, useEffect, ChangeEvent } from 'react';

// 1. Definimos la estructura de los datos que vienen de la base de datos
interface Conductor {
  id: string | number;
  nombre: string;
  // Agrega otros campos si es necesario (ej: rut)
}

interface Vehiculo {
  id: string | number;
  patente: string; 
  // o 'modelo', según tu DB
}

interface DataToEdit {
  fecha?: string;
  conductor?: Conductor;
  vehiculo?: Vehiculo;
  horaInicio?: string;
  horaFin?: string;
}

// 2. Definimos las Props del Modal
interface EditControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormDataState) => void;
  dataToEdit: DataToEdit | null;
}

// 3. Definimos el estado del formulario
interface FormDataState {
  fecha: string;
  conductorId: string | number;
  conductorNombre: string;
  vehiculoId: string | number;
  vehiculoNombre: string;
  horaInicio: string;
  horaFin: string;
}

export default function EditControlModal({ 
  isOpen, 
  onClose, 
  onSave, 
  dataToEdit 
}: EditControlModalProps) {

  const [formData, setFormData] = useState<FormDataState>({
    fecha: '',
    conductorId: '',
    conductorNombre: '',
    vehiculoId: '',
    vehiculoNombre: '',
    horaInicio: '',
    horaFin: ''
  });

  useEffect(() => {
    if (dataToEdit) {
      setFormData({
        fecha: dataToEdit.fecha || '',
        conductorId: dataToEdit.conductor?.id || '', 
        conductorNombre: dataToEdit.conductor?.nombre || '', 
        vehiculoId: dataToEdit.vehiculo?.id || '',
        vehiculoNombre: dataToEdit.vehiculo?.patente || '', 
        horaInicio: dataToEdit.horaInicio || '08:00',
        horaFin: dataToEdit.horaFin || '15:00'
      });
    }
  }, [dataToEdit]);

  // Lógica: Calcular 7 horas automáticamente
  // Notar el tipo del evento: ChangeEvent<HTMLInputElement>
  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newStartTime = e.target.value;
    
    if (!newStartTime) return;

    const [hours, minutes] = newStartTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);

    // SUMAR 7 HORAS
    date.setHours(date.getHours() + 7);

    const endHours = date.getHours().toString().padStart(2, '0');
    const endMinutes = date.getMinutes().toString().padStart(2, '0');
    const calculatedEndTime = `${endHours}:${endMinutes}`;

    setFormData(prev => ({
      ...prev,
      horaInicio: newStartTime,
      horaFin: calculatedEndTime
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-[400px] shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Editar Control Diario</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-4">
          
          {/* 1. FECHA */}
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <input 
              type="date"
              className="w-full border rounded p-2"
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
            />
          </div>

          {/* 2. CONDUCTOR (Solo Lectura) */}
          <div>
            <label className="block text-sm font-medium mb-1">Conductor</label>
            <input 
              type="text"
              className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              value={formData.conductorNombre} 
              disabled
              readOnly
            />
          </div>

          {/* 3. VEHÍCULO (Solo Lectura) */}
          <div>
            <label className="block text-sm font-medium mb-1">Vehículo</label>
            <input 
              type="text"
              className="w-full border rounded p-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              value={formData.vehiculoNombre}
              disabled
              readOnly
            />
          </div>

          {/* 4. HORARIO */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Inicio (Entrada)</label>
              <input 
                type="time"
                className="w-full border rounded p-2"
                value={formData.horaInicio}
                onChange={handleTimeChange}
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Fin (Salida)</label>
              <input 
                type="time"
                className="w-full border rounded p-2 bg-gray-50"
                value={formData.horaFin}
                readOnly
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">Calculado: +7 horas</p>
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}