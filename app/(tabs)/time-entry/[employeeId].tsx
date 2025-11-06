import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import apiService from '../../../src/services/api';

// Definición de colores por defecto
const Colors = {
  light: {
    primary: '#007AFF',
    background: '#ffffff',
    card: '#f5f5f5',
    text: '#000000',
    border: '#e0e0e0',
  },
  dark: {
    primary: '#0A84FF',
    background: '#121212',
    card: '#1E1E1E',
    text: '#ffffff',
    border: '#2D2D2D',
  },
} as const;

interface Employee {
  _id: string;
  name: string;
  email?: string;
  isActive: boolean;
}

interface TimeEntryForm {
  date: string;
  entryTime: string;
  exitTime: string;
  dailyRate: string;
  extraHours: string; // Mantenemos como string para compatibilidad
  extraHoursTime: Date; // Nuevo campo para el time picker
  extraHoursRate: string;
  notes: string;
}

export default function TimeEntryScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<{entry: boolean, exit: boolean}>({entry: false, exit: false});
  

  // Obtener la fecha actual en formato YYYY-MM-DD
  const getCurrentDate = () => {
    // Usar la fecha actual del sistema
    const now = new Date();
    // Ajustar a la zona horaria local
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<TimeEntryForm>(() => {
    const today = getCurrentDate();
    console.log('Fecha actual al iniciar:', today);
    return {
      date: today,
      entryTime: '',
      exitTime: '',
      dailyRate: '',
      extraHours: '0',
      extraHoursTime: new Date(0, 0, 0, 0, 0), // Solo para compatibilidad
      extraHoursRate: '0',
      notes: ''
    };
  });
  
  const [extraHoursInput, setExtraHoursInput] = useState('00:00');

  const [employee, setEmployee] = useState<Employee | null>(null);

  // Inicializar la fecha al montar el componente
  useEffect(() => {
    const today = getCurrentDate();
    console.log('Fecha actual forzada:', today);
    setFormData(prev => ({
      ...prev,
      date: today
    }));
  }, []);

  // Carregar dados do funcionário
  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        console.error('Nenhum ID de funcionário fornecido');
        Alert.alert('Erro', 'Nenhum ID de funcionário válido foi fornecido');
        return;
      }

      // Garantir que o employeeId seja uma string
      const id = Array.isArray(employeeId) ? employeeId[0] : employeeId;
      
      // Validar que o ID tenha o formato correto (pelo menos 1 caractere)
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        console.error('ID de funcionário inválido:', id);
        Alert.alert('Erro', 'O ID do funcionário não é válido');
        return;
      }

      try {
        setIsLoading(true);
        const data = await apiService.get<Employee>(`/employees/${id}`);
        setEmployee(data);
      } catch (error) {
        console.error('Erro ao cargar funcionário:', error);
        Alert.alert('Erro', 'Não foi possível carregar as informações do funcionário');
        // Opcional: voltar para a tela anterior em caso de erro
        // router.back();
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      // Usar una fecha fija para asegurar consistencia
      const fixedDate = new Date(selectedDate);
      const year = fixedDate.getFullYear();
      const month = String(fixedDate.getMonth() + 1).padStart(2, '0');
      const day = String(fixedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      console.log('Fecha seleccionada:', formattedDate);
      
      setFormData(prev => ({
        ...prev, 
        date: formattedDate
      }));
    }
  };

  const handleTimeChange = (type: 'entry' | 'exit', event: any, selectedTime?: Date) => {
    setShowTimePicker({...showTimePicker, [type]: false});
    if (selectedTime) {
      const timeString = format(selectedTime, 'HH:mm');
      if (type === 'entry') {
        setFormData({...formData, entryTime: timeString});
      } else {
        setFormData({...formData, exitTime: timeString});
      }
    }
  };

  // Função para validar e formatar o input de horas extras
  const handleExtraHoursChange = (text: string) => {
    // Apenas permite números e dois pontos
    const formattedText = text
      .replace(/[^0-9:]/g, '') // Apenas números e dois pontos
      .replace(/^[^0-9]/, '')   // Não pode começar com dois pontos
      .replace(/(\d{2}):?/g, '$1:') // Adiciona dois pontos após dois dígitos
      .replace(/:+/g, ':')      // Evita múltiplos dois pontos
      .replace(/(:\d{2}).*$/, '$1') // Limita a HH:MM
      .substring(0, 5);         // Limita a 5 caracteres (HH:MM)
    
    setExtraHoursInput(formattedText);
    
    // Calcular minutos totais para envio à API
    if (formattedText.length === 5) {
      const [hours, minutes] = formattedText.split(':').map(Number);
      const totalMinutes = (hours * 60) + minutes;
      setFormData({
        ...formData,
        extraHours: totalMinutes.toString(),
        extraHoursTime: new Date(0, 0, 0, hours, minutes)
      });
    }
  };

  // Calcular horas trabajadas normales (entrada - salida)
  const calculateWorkedHours = () => {
    if (!formData.entryTime || !formData.exitTime) return 0;
    
    try {
      const [entryHours, entryMinutes] = formData.entryTime.split(':').map(Number);
      const [exitHours, exitMinutes] = formData.exitTime.split(':').map(Number);
      
      // Calcular la diferencia en minutos
      const entryInMinutes = (entryHours * 60) + entryMinutes;
      const exitInMinutes = (exitHours * 60) + exitMinutes;
      
      // Si la hora de salida es menor que la de entrada, asumimos que es del día siguiente
      const totalMinutes = exitInMinutes > entryInMinutes 
        ? exitInMinutes - entryInMinutes 
        : (24 * 60 - entryInMinutes) + exitInMinutes;
      
      // Convertir a horas con decimales
      return totalMinutes / 60;
    } catch (error) {
      console.error('Error al calcular horas trabajadas:', error);
      return 0;
    }
  };

  const calculateTotal = () => {
    const dailyRate = parseFloat(formData.dailyRate) || 0;
    const extraRate = parseFloat(formData.extraHoursRate) || 0;
    
    // Calcular horas trabajadas normales
    const workedHours = calculateWorkedHours();
    
    // Calcular horas extras com base no input de texto
    const [hours = 0, minutes = 0] = extraHoursInput.split(':').map(Number);
    const extraHours = hours + (minutes / 60);
    
    // Calcular el total de horas (horas normales + horas extras)
    const totalHours = workedHours + extraHours;
    
    // Calcular el total monetario (valor diario + valor de horas extras)
    const totalEarnings = dailyRate + (extraHours * extraRate);
    
    return {
      total: isNaN(totalEarnings) ? 0 : parseFloat(totalEarnings.toFixed(2)),
      workedHours: parseFloat(workedHours.toFixed(2)),
      extraHours: parseFloat(extraHours.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2))
    };
  };

  const handleSubmit = async () => {
    if (!formData.entryTime || !formData.dailyRate) {
      Alert.alert('Erro', 'Por favor, preencha os campos obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      // Calcular totales
      const { total } = calculateTotal();
      
      // Crear objeto con los datos del registro según el esquema del backend
      const timeEntryData = {
        employee: employeeId,
        date: formData.date,
        entryTime: `${formData.date}T${formData.entryTime}:00.000Z`,
        ...(formData.exitTime && { exitTime: `${formData.date}T${formData.exitTime}:00.000Z` }),
        dailyRate: parseFloat(formData.dailyRate),
        total: total,
        notes: formData.notes || "",
        status: 'pending',
        extraHoursFormatted: `${formData.extraHoursTime.getHours().toString().padStart(2, '0')}:${formData.extraHoursTime.getMinutes().toString().padStart(2, '0')}`
        // El backend calculará automáticamente las horas trabajadas basadas en entryTime y exitTime
      };

      console.log('Enviando datos:', timeEntryData);
      
      // Enviar para a API
      await apiService.post('/time-entries', timeEntryData);
      
      Alert.alert('Sucesso', 'Registro salvo com sucesso', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Erro ao salvar o registro:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao salvar o registro';
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedDate = format(parseISO(formData.date), "EEEE d 'de' MMMM 'de' yyyy", { 
    locale: ptBR
  });
  const { total, workedHours, extraHours, totalHours } = calculateTotal();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Horário</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {employee && (
          <View style={[styles.employeeInfo, { backgroundColor: colors.card }]}>
            <Ionicons name="person-outline" size={24} color={colors.primary} />
            <View style={[styles.employeeTextContainer, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.employeeName, { color: colors.text }]}>{employee.name}</Text>
                <TouchableOpacity 
                  style={[styles.historyButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={() => router.push({
                    pathname: '/(tabs)/employee-history/[employeeId]',
                    params: { 
                      employeeId: employee._id,
                      employeeName: employee.name
                    }
                  })}
                >
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={[styles.historyButtonText, { color: colors.primary }]}>
                    Historial
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.employeeId, { color: colors.text + '80' }]}>ID: {employeeId}</Text>
            </View>
          </View>
        )}

        <View style={[styles.formContainer, { backgroundColor: colors.card }]}>
          {/* Selector de Fecha */}
          <TouchableOpacity 
            style={[styles.dateSelector, { borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.dateText, { color: colors.text }]}>{formattedDate}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.text + '80'} />
          </TouchableOpacity>

          {/* Selector de Hora de Entrada */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Hora de Entrada *</Text>
            <TouchableOpacity 
              style={[styles.timeInput, { borderColor: colors.border }]}
              onPress={() => setShowTimePicker({...showTimePicker, entry: true})}
            >
              <Text style={[styles.timeText, { color: formData.entryTime ? colors.text : colors.text + '80' }]}>
                {formData.entryTime || 'HH:MM'}
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Selector de Hora de Salida */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Hora de Saída</Text>
            <TouchableOpacity 
              style={[styles.timeInput, { borderColor: colors.border }]}
              onPress={() => setShowTimePicker({...showTimePicker, exit: true})}
            >
              <Text style={[styles.timeText, { color: formData.exitTime ? colors.text : colors.text + '80' }]}>
                {formData.exitTime || 'HH:MM'}
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Valor Diário */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Valor Diário *</Text>
            <View style={[styles.currencyInput, { borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>R$</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.dailyRate}
                onChangeText={(text) => setFormData({...formData, dailyRate: text.replace(/[^0-9]/g, '')})}
                placeholder="0"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Horas Extras - Input de texto */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Horas Extras (HH:MM)</Text>
            <View style={[styles.timeInput, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                value={extraHoursInput}
                onChangeText={handleExtraHoursChange}
                placeholder="00:00"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
                maxLength={5}
              />
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.helperText, { color: colors.text + '80' }]}>
              Formato: HH:MM (ex: 01:30 para uma hora e meia)
            </Text>
          </View>

          {/* Valor Hora Extra */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Valor Hora Extra</Text>
            <View style={[styles.currencyInput, { borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>R$</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={formData.extraHoursRate}
                onChangeText={(text) => setFormData({...formData, extraHoursRate: text.replace(/[^0-9]/g, '')})}
                placeholder="0"
                placeholderTextColor={colors.text + '80'}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Notas */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Notas</Text>
            <TextInput
              style={[styles.notesInput, { 
                backgroundColor: colors.background, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={formData.notes}
              onChangeText={(text) => setFormData({...formData, notes: text})}
              placeholder="Adicionar notas adicionais"
              placeholderTextColor={colors.text + '80'}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Resumen */}
          <View style={[styles.summaryContainer, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Total a Pagar:</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.summaryBreakdown}>
              <View style={styles.summaryRow}>
                <Text style={[styles.breakdownText, { color: colors.text + '80' }]}>
                  Horas normales:
                </Text>
                <Text style={[styles.breakdownText, { color: colors.text }]}>
                  {Math.floor(workedHours)}:{String(Math.round((workedHours % 1) * 60)).padStart(2, '0')} h
                </Text>
              </View>
              
              {extraHours > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.breakdownText, { color: colors.text + '80' }]}>
                    Horas extras:
                  </Text>
                  <Text style={[styles.breakdownText, { color: colors.text }]}>
                    {Math.floor(extraHours)}:{String(Math.round((extraHours % 1) * 60)).padStart(2, '0')} h
                  </Text>
                </View>
              )}
              
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              
              <View style={[styles.summaryRow, { marginTop: 4 }]}>
                <Text style={[styles.breakdownText, { color: colors.text, fontWeight: 'bold' }]}>
                  Total de horas:
                </Text>
                <Text style={[styles.breakdownText, { color: colors.primary, fontWeight: 'bold' }]}>
                  {Math.floor(totalHours)}:{String(Math.round((totalHours % 1) * 60)).padStart(2, '0')} h
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={[styles.breakdownText, { color: colors.text + '80' }]}>
                  Valor día:
                </Text>
                <Text style={[styles.breakdownText, { color: colors.text }]}>
                  R$ {parseFloat(formData.dailyRate || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              
              {parseInt(formData.extraHours) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.breakdownText, { color: colors.text + '80' }]}>
                    Valor horas extras ({extraHoursInput} h):
                  </Text>
                  <Text style={[styles.breakdownText, { color: colors.text }]}>
                    R$ {(extraHours * parseFloat(formData.extraHoursRate || '0')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botón de Guardar */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Registro</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date ? 
            new Date(formData.date + 'T12:00:00') : 
            new Date()
          }
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          locale="pt-BR"
          minimumDate={new Date(2020, 0, 1)}
          maximumDate={new Date(2030, 11, 31)}
        />
      )}

      {/* Time Pickers */}
      {showTimePicker.entry && (
        <DateTimePicker
          value={formData.entryTime ? new Date(`1970-01-01T${formData.entryTime}`) : new Date()}
          mode="time"
          display="spinner"
          onChange={(event, date) => handleTimeChange('entry', event, date)}
          locale="pt-BR"
        />
      )}

      {showTimePicker.exit && (
        <DateTimePicker
          value={formData.exitTime ? new Date(`1970-01-01T${formData.exitTime}`) : new Date()}
          mode="time"
          display="spinner"
          onChange={(event, date) => handleTimeChange('exit', event, date)}
          locale="pt-BR"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginRight: 32,
  },
  scrollView: {
    flex: 1,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 1,
  },
  employeeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  historyButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  employeeId: {
    fontSize: 12,
    marginTop: 2,
  },
  timeText: {
    fontSize: 16,
    marginRight: 8,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  formContainer: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'space-between',
  },
  viewEntriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  viewEntriesButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  currencySymbol: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  hourButton: {
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  hoursInput: {
    flex: 1,
    padding: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  summaryContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryBreakdown: {
    marginTop: 8,
    width: '100%',
  },
  summaryDivider: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },
  breakdownText: {
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
