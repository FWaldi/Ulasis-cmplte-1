import React, { useState, useRef } from 'react';
import type { QRCode, Questionnaire, DemoPlan } from '../../types';
import { PlusIcon, PencilIcon, TrashIcon, QRIcon, LockIcon, UploadIcon, CloseIcon, EyeIcon, DownloadIcon } from '../../../components/ui/Icons';
import Modal from '../../../components/ui/Modal';

const QRCodeForm: React.FC<{
    qrCode?: QRCode;
    questionnaires: Questionnaire[];
    isDemoMode: boolean;
    demoPlan: DemoPlan;
    onSave: (data: Omit<QRCode, 'id' | 'scans'> & { id?: number }) => void;
    onClose: () => void;
}> = ({ qrCode, questionnaires, isDemoMode, demoPlan, onSave, onClose }) => {
    const [name, setName] = useState(qrCode?.name || '');
    const [questionnaireId, setQuestionnaireId] = useState(qrCode?.questionnaireId || (questionnaires.length > 0 ? questionnaires[0].id : -1));
    const [color, setColor] = useState(qrCode?.color || '#007A7A');
    const [logoUrl, setLogoUrl] = useState(qrCode?.logoUrl || '');
    const fileInputRef = useRef<HTMLInputElement>(null);


    const isColorDisabled = isDemoMode && demoPlan === 'free';
    const isLogoDisabled = isDemoMode && demoPlan !== 'business';

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setLogoUrl(loadEvent.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoUrl('');
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || questionnaireId === -1) {
            alert('Silakan isi semua field.');
            return;
        }
        const linkedFormName = questionnaires.find(q => q.id === questionnaireId)?.name || 'N/A';
        onSave({ 
            id: qrCode?.id, 
            name, 
            questionnaireId, 
            linkedForm: linkedFormName,
            color: isColorDisabled ? '#007A7A' : color,
            logoUrl: isLogoDisabled ? '' : logoUrl,
        });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama QR Code</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., QR Meja 1"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    required
                />
            </div>
            <div>
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tautkan ke Kuesioner</label>
                 <select
                    value={questionnaireId}
                    onChange={e => setQuestionnaireId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    required
                 >
                     {questionnaires.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                 </select>
            </div>
            
            <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Warna QR Code</label>
                 <div className="flex items-center space-x-2">
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className={`p-1 h-10 w-14 block bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
                        disabled={isColorDisabled}
                        title={isColorDisabled ? "Tersedia di paket STARTER atau lebih tinggi" : "Pilih warna"}
                    />
                    <input type="text" value={color} onChange={e => setColor(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50" disabled={isColorDisabled}/>
                 </div>
                 {isColorDisabled && <LockIcon className="w-4 h-4 text-slate-400 absolute top-0 right-2"/>}
            </div>
            
             <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo (Opsional)</label>
                <div className={`w-full p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg ${isLogoDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {logoUrl ? (
                         <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <img src={logoUrl} alt="Logo preview" className="w-10 h-10 rounded object-contain"/>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Gambar dipilih</span>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleRemoveLogo} 
                                className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
                                disabled={isLogoDisabled}
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                         </div>
                    ) : (
                        <>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml"
                                ref={fileInputRef}
                                onChange={handleLogoChange}
                                className="hidden"
                                id="logo-upload"
                                disabled={isLogoDisabled}
                            />
                            <label 
                                htmlFor="logo-upload"
                                title={isLogoDisabled ? "Tersedia di paket BUSINESS" : "Unggah Logo"}
                                className={`flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-500 rounded-md ${isLogoDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <UploadIcon className="w-5 h-5 text-slate-500 dark:text-slate-400"/>
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Unggah Logo</span>
                            </label>
                        </>
                    )}
                </div>
                {isLogoDisabled && <LockIcon className="w-4 h-4 text-slate-400 absolute top-0 right-2"/>}
            </div>


            <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500">Batal</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-lg">Simpan</button>
            </div>
        </form>
    );
}

const QRCodeCard: React.FC<{
    qrCode: QRCode;
    onEdit: (qrCode: QRCode) => void;
    onDelete: (id: number) => void;
    onPreview: (questionnaireId: number) => void;
}> = ({ qrCode, onEdit, onDelete, onPreview }) => {
    const [showQRModal, setShowQRModal] = useState(false);
    
    const generateQRURL = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/public-form/${qrCode.questionnaireId}`;
    };

    const downloadQRCode = async () => {
        try {
            // Use backend QR code image if available, otherwise generate one
            let qrImageUrl;
            
            if (qrCode.qrCodeImage) {
                // Use backend-generated QR code image
                const baseUrl = window.location.origin;
                qrImageUrl = `${baseUrl}/${qrCode.qrCodeImage}`;
            } else {
                // Fallback to external service with proper color handling
                const colorHex = (qrCode.color || '#007A7A').replace('#', '');
                qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generateQRURL())}&color=${colorHex}&bgcolor=FFFFFF`;
            }
            
            // Download the image
            const response = await fetch(qrImageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `qr-${qrCode.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading QR code:', error);
            alert('Gagal mengunduh QR code. Silakan coba lagi.');
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md dark:shadow-slate-700/50 flex flex-col">
                <div className="flex items-start justify-between">
                    <div className="flex items-center mr-2">
                        <div className="w-3 h-8 rounded-sm mr-3" style={{ backgroundColor: qrCode.color || '#007A7A' }}></div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex-1">{qrCode.name}</h3>
                    </div>
                    <div className="flex space-x-1 flex-shrink-0">
                        <button onClick={() => setShowQRModal(true)} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" title="Lihat QR Code">
                            <QRIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => onPreview(qrCode.questionnaireId)} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" title="Pratinjau Formulir">
                            <EyeIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => onEdit(qrCode)} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" title="Edit">
                            <PencilIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => onDelete(qrCode.id)} className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" title="Hapus">
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-5">
                    Tertaut ke: <span className="font-semibold">{qrCode.linkedForm}</span>
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm flex-1 flex justify-between items-center">
                    <p className="text-slate-600 dark:text-slate-400">Total Pindai:</p>
                    <p className="font-bold text-2xl text-slate-800 dark:text-slate-100">{qrCode.scans}</p>
                </div>
            </div>

            {/* QR Code Display Modal */}
            {showQRModal && (
                <Modal title={`QR Code: ${qrCode.name}`} onClose={() => setShowQRModal(false)}>
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <img 
                                src={qrCode.qrCodeImage ? `${window.location.origin}/${qrCode.qrCodeImage}` : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generateQRURL())}&color=${encodeURIComponent((qrCode.color || '#007A7A').replace('#', ''))}&bgcolor=FFFFFF`}
                                alt={`QR Code for ${qrCode.name}`}
                                className="border-2 border-slate-200 dark:border-slate-600 rounded-lg max-w-full"
                            />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                URL: <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{generateQRURL()}</span>
                            </p>
                            <div className="flex justify-center space-x-2">
                                <button
                                    onClick={downloadQRCode}
                                    className="flex items-center px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg transition-colors"
                                >
                                    <DownloadIcon className="w-4 h-4 mr-2" />
                                    Download PNG
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(generateQRURL());
                                        alert('URL berhasil disalin!');
                                    }}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
                                >
                                    Salin URL
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};


const QRCodes: React.FC<{
    qrCodes: QRCode[];
    questionnaires: Questionnaire[];
    isDemoMode: boolean;
    demoPlan: DemoPlan;
    onSave: (data: Omit<QRCode, 'id' | 'scans'> & { id?: number }) => void;
    onDelete: (id: number) => void;
    onPreview: (questionnaireId: number) => void;
}> = ({ qrCodes, questionnaires, isDemoMode, demoPlan, onSave, onDelete, onPreview }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQRCode, setEditingQRCode] = useState<QRCode | undefined>(undefined);

    const handleEdit = (qrCode: QRCode) => {
        setEditingQRCode(qrCode);
        setIsModalOpen(true);
    };
    
    const handleAddNew = () => {
        setEditingQRCode(undefined);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus QR Code ini?")) {
            onDelete(id);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">QR Codes</h1>
                <button onClick={handleAddNew} className="flex items-center w-full sm:w-auto justify-center px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-lg shadow-md transition-all">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Buat QR Code Baru
                </button>
            </div>

             {qrCodes && qrCodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {qrCodes.map(qr => <QRCodeCard key={qr.id} qrCode={qr} onEdit={handleEdit} onDelete={handleDelete} onPreview={onPreview}/>)}
                </div>
             ) : (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <QRIcon className="w-12 h-12 mx-auto text-slate-400" />
                    <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-300">Belum Ada QR Code</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Buat QR code pertama Anda untuk mulai mengumpulkan ulasan.</p>
                </div>
             )}


            {isModalOpen && (
                <Modal title={editingQRCode ? 'Edit QR Code' : 'Buat QR Code Baru'} onClose={() => setIsModalOpen(false)}>
                    <QRCodeForm
                        qrCode={editingQRCode}
                        questionnaires={questionnaires}
                        isDemoMode={isDemoMode}
                        demoPlan={demoPlan}
                        onSave={onSave}
                        onClose={() => setIsModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default QRCodes;