// src/app/(dashboard)/dashboard/books/import/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { BookCondition } from '@prisma/client';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, Check, ChevronsRight, ListChecks, Send, Loader2, AlertTriangle, FileUp } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Tipos
type CsvRow = Record<string, string>;
type Step = 'upload' | 'mapping' | 'review' | 'result';
type Mapping = Record<string, keyof BookImportData | ''>;
type ImportResult = {
  successCount: number;
  errorCount: number;
  errors: { row: number; data: CsvRow; message: string }[];
};

// Schema de validação para cada linha (usado no frontend e backend)
const bookImportSchema = z.object({
  title: z.string().min(3),
  author: z.string().min(3),
  price: z.coerce.number().positive(),
  condition: z.nativeEnum(BookCondition),
  categoryName: z.string().min(2),
  description: z.string().optional().nullable(),
  stock: z.coerce.number().int().min(0).optional().default(1),
  coverImageUrl: z.string().url().optional().nullable(),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.coerce.number().int().optional().nullable(),
  language: z.string().optional().nullable(),
  pages: z.coerce.number().int().positive().optional().nullable(),
});

type BookImportData = z.infer<typeof bookImportSchema>;

const bookDbFields: {
    required: { value: keyof BookImportData; label: string }[];
    optional: { value: keyof BookImportData; label: string }[];
} = {
  required: [
    { value: 'title', label: 'Título' },
    { value: 'author', label: 'Autor' },
    { value: 'price', label: 'Preço (Ex: 29,90)' },
    { value: 'condition', label: 'Condição' },
    { value: 'categoryName', label: 'Nome da Categoria' },
  ],
  optional: [
    { value: 'description', label: 'Descrição' },
    { value: 'stock', label: 'Stock' },
    { value: 'coverImageUrl', label: 'URL da Imagem de Capa' },
    { value: 'isbn', label: 'ISBN' },
    { value: 'publisher', label: 'Editora' },
    { value: 'publicationYear', label: 'Ano de Publicação' },
    { value: 'language', label: 'Idioma' },
    { value: 'pages', label: 'Número de Páginas' },
  ],
};


// Dicionário para mapeamento automático de cabeçalhos comuns em português
const headerAutoMap: Record<string, keyof BookImportData> = {
  'título': 'title',
  'titulo': 'title',
  'livro': 'title',
  'autor': 'author',
  'autores': 'author',
  'preço': 'price',
  'preco': 'price',
  'valor': 'price',
  'condição': 'condition',
  'condicao': 'condition',
  'estado': 'condition',
  'categoria': 'categoryName',
  'gênero': 'categoryName',
  'genero': 'categoryName',
  'descrição': 'description',
  'descricao': 'description',
  'sinopse': 'description',
  'stock': 'stock',
  'quantidade': 'stock',
  'qtd': 'stock',
  'url da imagem': 'coverImageUrl',
  'url da capa': 'coverImageUrl',
  'imagem': 'coverImageUrl',
  'capa': 'coverImageUrl',
  'isbn': 'isbn',
  'editora': 'publisher',
  'ano': 'publicationYear',
  'ano de publicação': 'publicationYear',
  'ano publicacao': 'publicationYear',
  'idioma': 'language',
  'páginas': 'pages',
  'paginas': 'pages',
  'nº de páginas': 'pages',
  'no. de paginas': 'pages',
};

const normalizePrice = (price: any): number | undefined => {
    if (typeof price === 'number') return price;
    if (typeof price !== 'string') return undefined;
    const cleanedPrice = price.replace("R$", "").replace(".", "").replace(",", ".").trim();
    const number = parseFloat(cleanedPrice);
    return isNaN(number) ? undefined : number;
}

const normalizeCondition = (condition: any): BookCondition | undefined => {
    if (typeof condition !== 'string') return undefined;
    const lowerCaseCondition = condition.toLowerCase().trim();
    const map: Record<string, BookCondition> = {
        'novo': BookCondition.NEW,
        'new': BookCondition.NEW,
        'usado - como novo': BookCondition.USED_LIKE_NEW,
        'usado como novo': BookCondition.USED_LIKE_NEW,
        'usado': BookCondition.USED_GOOD,
        'usado - bom': BookCondition.USED_GOOD,
        'usado bom': BookCondition.USED_GOOD,
        'usado - razoável': BookCondition.USED_FAIR,
        'usado razoavel': BookCondition.USED_FAIR,
    };
    return map[lowerCaseCondition] || condition as BookCondition;
}

export default function ImportBooksPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Mapping>({});
  const [processing, setProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const processAndSetData = (data: CsvRow[]) => {
    if (data.length === 0) {
      toast.error("O ficheiro parece estar vazio ou num formato incorreto.");
      return;
    }
    const headers = Object.keys(data[0]);
    setCsvHeaders(headers);

    const initialMappings: Mapping = {};
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      const dbField = headerAutoMap[normalizedHeader];
      if (dbField) {
        initialMappings[header] = dbField;
      }
    });
    setMappings(initialMappings);

    setCsvData(data);
    setStep('mapping');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProcessing(true);

      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processAndSetData(results.data as CsvRow[]);
            setProcessing(false);
          },
          error: (error) => {
            toast.error('Erro ao ler o ficheiro CSV.');
            console.error(error);
            setProcessing(false);
          },
        });
      } else if (fileExtension === 'xlsx') {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<CsvRow>(worksheet);
            processAndSetData(jsonData);
          } catch (error) {
            toast.error("Erro ao processar ficheiro XLSX.");
            console.error(error);
          } finally {
            setProcessing(false);
          }
        };
        reader.onerror = () => {
          toast.error("Não foi possível ler o ficheiro XLSX.");
          setProcessing(false);
        };
        reader.readAsBinaryString(selectedFile);
      } else {
        toast.error("Formato de ficheiro não suportado. Use .CSV ou .XLSX.");
        setProcessing(false);
      }
    }
  };

  const handleMappingChange = (csvHeader: string, dbField: string) => {
    const finalValue = dbField === '--ignore--' ? '' : (dbField as keyof BookImportData);
    setMappings((prev) => ({ ...prev, [csvHeader]: finalValue }));
  };

  const isMappingComplete = useMemo(() => {
    const mappedDbFields = Object.values(mappings);
    return bookDbFields.required.every((field) => mappedDbFields.includes(field.value));
  }, [mappings]);

  const transformDataForReview = () => {
    return csvData.map((row) => {
        const transformedRow: Partial<BookImportData> = {};
        for (const csvHeader in mappings) {
            const dbField = mappings[csvHeader];
            if (dbField && row[csvHeader] !== undefined) {
                (transformedRow as any)[dbField] = row[csvHeader];
            }
        }
        return transformedRow;
    });
  };

  const handleStartImport = async () => {
    setProcessing(true);
    const transformedData = transformDataForReview();
    const toastId = toast.loading(`A importar ${transformedData.length} livros...`);
    try {
        const response = await axios.post('/api/books/batch-import', { books: transformedData });
        setImportResult(response.data);
        setStep('result');
        toast.success(`Importação concluída!`, { id: toastId });
    } catch (error) {
        const axiosError = error as AxiosError<{ error?: string }>;
        toast.error(axiosError.response?.data?.error || "Ocorreu um erro grave na importação.", { id: toastId });
    } finally {
        setProcessing(false);
    }
  };

  const resetProcess = () => {
    setFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setMappings({});
    setImportResult(null);
    setStep('upload');
  };

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <Card className="text-center">
            <CardHeader>
              <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
              <CardTitle>Passo 1: Enviar Ficheiro</CardTitle>
              <CardDescription>Selecione um ficheiro .CSV ou .XLSX do seu computador. A primeira linha deve conter os cabeçalhos das colunas (ex: Título, Autor, Preço).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mx-auto max-w-xs">
                    <label htmlFor="csv-upload" className={cn(buttonVariants({ variant: "default", size: "lg" }), "cursor-pointer w-full bg-emerald-600 hover:bg-emerald-700")}>
                        <FileUp className="mr-2 h-5 w-5" />
                        Selecionar Ficheiro
                    </label>
                    <input id="csv-upload" type="file" accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={handleFileSelect} disabled={processing} />
                </div>
                {processing && <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />}
            </CardContent>
          </Card>
        );
      
      case 'mapping':
        return (
          <Card>
            <CardHeader>
                <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                <CardTitle>Passo 2: Mapear Colunas</CardTitle>
                <CardDescription>Associamos automaticamente as colunas que reconhecemos. Reveja e associe as colunas restantes. Campos com * são obrigatórios.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Coluna do seu Ficheiro</TableHead><TableHead>Corresponde a...</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {csvHeaders.map((header) => (
                            <TableRow key={header}>
                                <TableCell className="font-medium">{header}</TableCell>
                                <TableCell>
                                    <Select onValueChange={(value) => handleMappingChange(header, value)} defaultValue={mappings[header] || '--ignore--'}>
                                        <SelectTrigger><SelectValue placeholder="Selecione um campo..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="--ignore--">Ignorar esta coluna</SelectItem>
                                            <SelectGroup>
                                                <SelectLabel>Campos Obrigatórios</SelectLabel>
                                                {bookDbFields.required.map(field => (
                                                    <SelectItem key={field.value} value={field.value}>{field.label} *</SelectItem>
                                                ))}
                                            </SelectGroup>
                                            <SelectGroup>
                                                <SelectLabel>Campos Opcionais</SelectLabel>
                                                {bookDbFields.optional.map(field => (
                                                    <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={() => setStep('review')} disabled={!isMappingComplete}>
                        Rever Dados <ChevronsRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
          </Card>
        );

      case 'review':
        const reviewData = transformDataForReview();
        return (
            <Card>
                <CardHeader>
                    <ListChecks className="mx-auto h-12 w-12 text-slate-400" />
                    <CardTitle>Passo 3: Rever e Confirmar</CardTitle>
                    <CardDescription>Confira uma amostra dos seus dados. Se tudo estiver correto, inicie a importação.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="overflow-x-auto max-h-96">
                        <Table>
                            <TableHeader><TableRow>
                                {bookDbFields.required.map(f => <TableHead key={f.value}>{f.label}</TableHead>)}
                                <TableHead>Status</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {reviewData.slice(0, 10).map((row, index) => {
                                    const transformedRowForValidation = {
                                        ...row,
                                        price: normalizePrice(row.price),
                                        condition: normalizeCondition(row.condition)
                                    };
                                    const validation = bookImportSchema.safeParse(transformedRowForValidation);
                                    return (
                                        <TableRow key={index} className={!validation.success ? "bg-red-500/10" : ""}>
                                            {bookDbFields.required.map(f => <TableCell key={f.value}>{(row as any)[f.value] || ""}</TableCell>)}
                                            <TableCell>
                                                {validation.success ? <Check className="h-5 w-5 text-green-500" /> : 
                                                <div title={JSON.stringify(validation.error.flatten().fieldErrors)}>
                                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                                </div>
                                                }
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                     </div>
                    <div className="mt-6 flex justify-between items-center">
                        <Button variant="outline" onClick={() => setStep('mapping')}>Voltar para Mapeamento</Button>
                        <Button onClick={handleStartImport} disabled={processing}>
                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                            Confirmar e Importar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
      case 'result':
        return (
            <Card>
                <CardHeader>
                    <Check className="mx-auto h-12 w-12 text-green-500" />
                    <CardTitle>Passo 4: Resultado da Importação</CardTitle>
                    <CardDescription>A importação foi concluída.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="font-bold text-green-300">{importResult?.successCount} livros importados com sucesso!</p>
                    </div>
                    {importResult && importResult.errorCount > 0 && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="font-bold text-red-300">{importResult.errorCount} livros falharam ao importar.</p>
                            <div className="mt-2 text-sm text-red-400 max-h-60 overflow-y-auto">
                                <ul>
                                    {importResult.errors.map(err => (
                                        <li key={err.row} className="mt-1"><strong>Linha {err.row + 2}:</strong> {err.message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    <div className="mt-6 flex justify-end space-x-2">
                        <Button variant="outline" onClick={resetProcess}>Importar Novo Ficheiro</Button>
                        <Button onClick={() => router.push('/dashboard/books')}>Ver os Meus Livros</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Importar Livros em Lote</h1>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
