// src/components/dashboard/charts/BooksByCategoryChart.tsx
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2'; // Você pode escolher Bar, Doughnut, Pie, etc.
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement, // Necessário para Doughnut e Pie
} from 'chart.js';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Registrar os componentes necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Registre ArcElement
  Title,
  Tooltip,
  Legend
);

interface ChartDataState {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export function BooksByCategoryChart() {
  const [chartData, setChartData] = useState<ChartDataState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get('/api/dashboard/charts/books-by-category');
        setChartData(response.data);
      } catch (err) {
        console.error("Erro ao buscar dados do gráfico:", err);
        setError('Não foi possível carregar os dados do gráfico.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-72 w-full bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="ml-2 text-muted-foreground">Carregando gráfico...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-72 w-full bg-red-50 dark:bg-red-900/30 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!chartData || chartData.datasets.every(ds => ds.data.length === 0)) {
    return (
      <div className="flex justify-center items-center h-72 w-full bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-muted-foreground">Nenhum livro cadastrado em categorias para exibir no gráfico.</p>
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Importante para controlar a altura via CSS do container
    plugins: {
      legend: {
        position: 'top' as const, // Ou 'bottom', 'left', 'right'
        labels: {
            color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#4b5563', // Cor do texto da legenda
        }
      },
      title: {
        display: true,
        text: 'Distribuição de Livros por Categoria',
        color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#1f2937', // Cor do título
        font: { size: 16 }
      },
      tooltip: {
        backgroundColor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#374151' : '#fff',
        titleColor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#1f2937',
        bodyColor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#1f2937',
        borderColor: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb',
        borderWidth: 1,
      }
    },
    scales: { // Aplicável para gráficos de Barra, Linha, etc. Não tanto para Doughnut/Pie
        y: {
            beginAtZero: true,
            ticks: { 
                stepSize: 1, // Garante que o eixo Y mostre apenas números inteiros se os dados forem contagens
                color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
            },
             grid: {
                color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'rgba(100, 116, 139, 0.2)' : 'rgba(203, 213, 225, 0.5)',
            }
        },
        x: {
            ticks: { 
                color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280',
            },
            grid: {
                display: false, // Oculta as linhas de grade do eixo X para um visual mais limpo
            }
        }
    }
  };

  // Para um gráfico de Doughnut ou Pie, as opções de 'scales' não são aplicáveis.
  // Você pode escolher qual tipo de gráfico usar:
  // return <Bar options={options} data={chartData} />;
  return <Doughnut options={{...options, scales: undefined }} data={chartData} />; // Removendo scales para Doughnut
}