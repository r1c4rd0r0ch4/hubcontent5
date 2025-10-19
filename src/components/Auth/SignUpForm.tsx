import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, UserPlus, X, Calendar, MapPin, FileText, Camera } from 'lucide-react';
import { uploadKycDocument } from '../../lib/upload';
import type { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase'; // Ensure supabase is imported

type KycDocumentType = Database['public']['Enums']['kyc_document_type_enum'];

export function SignUpForm({ onToggle, onClose }: { onToggle: () => void; onClose?: () => void }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState<'user' | 'influencer'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); // New state for field-specific errors

  // KYC Fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [documentType, setDocumentType] = useState(''); // RG, CPF, CNH
  const [documentNumber, setDocumentNumber] = useState('');

  // KYC Document Uploads
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const [selfieWithIdFile, setSelfieWithIdFile] = useState<File | null>(null);

  const [idFrontUploadStatus, setIdFrontUploadStatus] = useState<{ url: string; path: string } | null>(null);
  const [idBackUploadStatus, setIdBackUploadStatus] = useState<{ url: string; path: string } | null>(null);
  const [proofOfAddressUploadStatus, setProofOfAddressUploadStatus] = useState<{ url: string; path: string } | null>(null);
  const [selfieWithIdUploadStatus, setSelfieWithIdStatus] = useState<{ url: string; path: string } | null>(null);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>, fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
      setFieldErrors(prev => ({ ...prev, [fieldName]: '' })); // Clear error for this field
    } else {
      setter(null);
    }
  };

  const uploadKycDocuments = async (userId: string) => {
    const uploadErrors: string[] = [];

    const uploadAndSetStatus = async (file: File | null, type: KycDocumentType, setter: React.Dispatch<React.SetStateAction<{ url: string; path: string } | null>>) => {
      if (file) {
        console.log(`[SignUpForm] Tentando fazer upload do documento ${type} para Storage...`);
        const { data, error: uploadError } = await uploadKycDocument(file, userId, type);
        
        if (uploadError) {
          console.error(`[SignUpForm] Erro ao fazer upload do documento ${type} para Storage:`, uploadError);
          uploadErrors.push(`Erro ao enviar ${type}: ${uploadError.message}`);
        } else if (data) {
          console.log(`[SignUpForm] Documento ${type} enviado para Storage com sucesso. URL: ${data.url}, Path: ${data.path}`);
          setter(data);
          
          console.log(`[SignUpForm] Tentando registrar documento ${type} no DB para user_id: ${userId}...`);
          const { error: dbError } = await supabase.from('kyc_documents').insert({
            user_id: userId,
            document_type: type,
            file_url: data.url,
            file_path: data.path,
            status: 'pending',
          });
          if (dbError) {
            console.error(`[SignUpForm] Erro ao registrar documento ${type} no DB:`, dbError);
            uploadErrors.push(`Erro ao registrar ${type} no DB: ${dbError.message}`);
          } else {
            console.log(`[SignUpForm] Documento ${type} registrado no DB com sucesso.`);
          }
        }
      }
    };

    await Promise.all([
      uploadAndSetStatus(idFrontFile, 'id_front', setIdFrontUploadStatus),
      uploadAndSetStatus(idBackFile, 'id_back', setIdBackUploadStatus),
      uploadAndSetStatus(proofOfAddressFile, 'proof_of_address', setProofOfAddressUploadStatus),
      uploadAndSetStatus(selfieWithIdFile, 'selfie_with_id', setSelfieWithIdStatus),
    ]);

    if (uploadErrors.length > 0) {
      throw new Error(uploadErrors.join('\n'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({}); // Clear previous field errors
    setLoading(true);

    let currentFieldErrors: Record<string, string> = {};

    // Basic validation for all users
    if (!username) currentFieldErrors.username = 'Nome de usuário é obrigatório.';
    if (!email) currentFieldErrors.email = 'Email é obrigatório.';
    if (!password) currentFieldErrors.password = 'Senha é obrigatória.';
    else if (password.length < 6) currentFieldErrors.password = 'A senha deve ter no mínimo 6 caracteres.';

    // KYC Validation for influencers
    if (userType === 'influencer') {
      if (!fullName) currentFieldErrors.fullName = 'Nome completo é obrigatório.';
      if (!dateOfBirth) currentFieldErrors.dateOfBirth = 'Data de nascimento é obrigatória.';
      if (!addressStreet) currentFieldErrors.addressStreet = 'Rua e número são obrigatórios.';
      if (!addressCity) currentFieldErrors.addressCity = 'Cidade é obrigatória.';
      if (!addressState) currentFieldErrors.addressState = 'Estado é obrigatório.';
      if (!addressZip) currentFieldErrors.addressZip = 'CEP é obrigatório.';
      if (!addressCountry) currentFieldErrors.addressCountry = 'País é obrigatório.';
      if (!documentType) currentFieldErrors.documentType = 'Tipo de documento é obrigatório.';
      if (!documentNumber) currentFieldErrors.documentNumber = 'Número do documento é obrigatório.';
      if (!idFrontFile) currentFieldErrors.idFrontFile = 'Foto da frente do documento é obrigatória.';
      if (!idBackFile) currentFieldErrors.idBackFile = 'Foto do verso do documento é obrigatória.';
      if (!proofOfAddressFile) currentFieldErrors.proofOfAddressFile = 'Comprovante de endereço é obrigatório.';
      if (!selfieWithIdFile) currentFieldErrors.selfieWithIdFile = 'Selfie com documento é obrigatória.';
    }

    if (Object.keys(currentFieldErrors).length > 0) {
      setFieldErrors(currentFieldErrors);
      setError('Por favor, preencha todos os campos e envie todos os documentos obrigatórios.');
      setLoading(false);
      return;
    }

    console.log('[SignUpForm] Iniciando processo de cadastro...');
    const { error: signUpError, data: userData } = await signUp(email, password, username, userType, {
      fullName,
      dateOfBirth,
      address: {
        street: addressStreet,
        city: addressCity,
        state: addressState,
        zip: addressZip,
        country: addressCountry,
      },
      documentType,
      documentNumber,
    });

    if (signUpError) {
      console.error('[SignUpForm] Erro no cadastro do usuário:', signUpError);
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    console.log('[SignUpForm] Usuário cadastrado com sucesso:', userData?.user?.id);

    if (userType === 'influencer' && userData?.user?.id) {
      console.log('[SignUpForm] Usuário é influenciador, iniciando upload de documentos KYC...');
      try {
        await uploadKycDocuments(userData.user.id);
        console.log('[SignUpForm] Upload e registro de documentos KYC concluídos com sucesso.');
      } catch (uploadError: any) {
        console.error('[SignUpForm] Erro durante o upload/registro de documentos KYC:', uploadError);
        setError(`Erro no upload de documentos: ${uploadError.message}`);
        // Potentially revert user creation or mark profile for manual review
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    // Optionally, show a success message or redirect
    if (onClose) onClose();
  };

  const inputClass = (fieldName: string) =>
    `w-full px-4 py-3 rounded-lg border ${fieldErrors[fieldName] ? 'border-error focus:ring-error' : 'border-border focus:ring-primary'} bg-background focus:ring-2 focus:border-transparent transition-all text-text`;

  const fileInputClass = (fieldName: string) =>
    `flex items-center justify-between p-4 border ${fieldErrors[fieldName] ? 'border-error' : 'border-border'} rounded-lg bg-background`;

  const errorTextClass = "text-error text-sm mt-1";

  return (
    <div className={`w-full mx-auto transition-all duration-300 ${userType === 'influencer' ? 'max-w-4xl' : 'max-w-xl'}`}> {/* Ajustado max-w dinamicamente */}
      <div className="bg-surface rounded-2xl shadow-xl p-8 relative max-h-[80vh] flex flex-col border border-border"> {/* Ajustado bg, border, shadow e max-h */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-textSecondary hover:text-text hover:bg-surface/50 rounded-lg transition-colors flex-shrink-0"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex-shrink-0 pb-4"> {/* Header wrapper */}
          <h2 className="text-3xl font-bold text-text mb-2">Criar Conta</h2>
          <p className="text-textSecondary mb-4">Junte-se à maior plataforma de conteúdo adulto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-grow overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Tipo de Conta
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setUserType('user')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  userType === 'user'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-textSecondary hover:text-text'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Usuário</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType('influencer')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  userType === 'influencer'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-textSecondary hover:text-text'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Influencer</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-textSecondary mb-2">
              Nome de Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setFieldErrors(prev => ({ ...prev, username: '' })); }}
              className={inputClass('username')}
              placeholder="seunome"
            />
            {fieldErrors.username && <p className={errorTextClass}>{fieldErrors.username}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-textSecondary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
              className={inputClass('email')}
              placeholder="seu@email.com"
            />
            {fieldErrors.email && <p className={errorTextClass}>{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-textSecondary mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
              className={inputClass('password')}
              placeholder="Mínimo 6 caracteres"
            />
            {fieldErrors.password && <p className={errorTextClass}>{fieldErrors.password}</p>}
          </div>

          {userType === 'influencer' && (
            <div className="space-y-6 border-t border-border pt-6 mt-6">
              <h3 className="text-xl font-bold text-text">Dados KYC (Verificação de Identidade)</h3>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-textSecondary mb-2">
                  Nome Completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setFieldErrors(prev => ({ ...prev, fullName: '' })); }}
                  className={inputClass('fullName')}
                  placeholder="Seu nome completo"
                />
                {fieldErrors.fullName && <p className={errorTextClass}>{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-textSecondary mb-2">
                  Data de Nascimento
                </label>
                <div className="relative">
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => { setDateOfBirth(e.target.value); setFieldErrors(prev => ({ ...prev, dateOfBirth: '' })); }}
                    className={`${inputClass('dateOfBirth')} pr-10`}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary w-5 h-5" />
                </div>
                {fieldErrors.dateOfBirth && <p className={errorTextClass}>{fieldErrors.dateOfBirth}</p>}
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={addressStreet}
                  onChange={(e) => { setAddressStreet(e.target.value); setFieldErrors(prev => ({ ...prev, addressStreet: '' })); }}
                  className={inputClass('addressStreet')}
                  placeholder="Rua, número, complemento"
                />
                {fieldErrors.addressStreet && <p className={errorTextClass}>{fieldErrors.addressStreet}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={addressCity}
                      onChange={(e) => { setAddressCity(e.target.value); setFieldErrors(prev => ({ ...prev, addressCity: '' })); }}
                      className={inputClass('addressCity')}
                      placeholder="Cidade"
                    />
                    {fieldErrors.addressCity && <p className={errorTextClass}>{fieldErrors.addressCity}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={addressState}
                      onChange={(e) => { setAddressState(e.target.value); setFieldErrors(prev => ({ ...prev, addressState: '' })); }}
                      className={inputClass('addressState')}
                      placeholder="Estado"
                    />
                    {fieldErrors.addressState && <p className={errorTextClass}>{fieldErrors.addressState}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={addressZip}
                      onChange={(e) => { setAddressZip(e.target.value); setFieldErrors(prev => ({ ...prev, addressZip: '' })); }}
                      className={inputClass('addressZip')}
                      placeholder="CEP"
                    />
                    {fieldErrors.addressZip && <p className={errorTextClass}>{fieldErrors.addressZip}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={addressCountry}
                      onChange={(e) => { setAddressCountry(e.target.value); setFieldErrors(prev => ({ ...prev, addressCountry: '' })); }}
                      className={inputClass('addressCountry')}
                      placeholder="País"
                    />
                    {fieldErrors.addressCountry && <p className={errorTextClass}>{fieldErrors.addressCountry}</p>}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="documentType" className="block text-sm font-medium text-textSecondary mb-2">
                  Tipo de Documento de Identificação
                </label>
                <select
                  id="documentType"
                  value={documentType}
                  onChange={(e) => { setDocumentType(e.target.value); setFieldErrors(prev => ({ ...prev, documentType: '' })); }}
                  className={inputClass('documentType')}
                >
                  <option value="">Selecione</option>
                  <option value="id_front">RG/CNH (Frente)</option>
                  <option value="id_back">RG/CNH (Verso)</option>
                  <option value="cpf">CPF</option>
                  <option value="passport">Passaporte</option>
                  <option value="other">Outro</option>
                </select>
                {fieldErrors.documentType && <p className={errorTextClass}>{fieldErrors.documentType}</p>}
              </div>

              <div>
                <label htmlFor="documentNumber" className="block text-sm font-medium text-textSecondary mb-2">
                  Número do Documento
                </label>
                <input
                  id="documentNumber"
                  type="text"
                  value={documentNumber}
                  onChange={(e) => { setDocumentNumber(e.target.value); setFieldErrors(prev => ({ ...prev, documentNumber: '' })); }}
                  className={inputClass('documentNumber')}
                  placeholder="Número do documento"
                />
                {fieldErrors.documentNumber && <p className={errorTextClass}>{fieldErrors.documentNumber}</p>}
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-text">Upload de Documentos</h4>

                <div className={fileInputClass('idFrontFile')}>
                  <label htmlFor="idFrontFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Foto do Documento (Frente)</span>
                  </label>
                  <input
                    id="idFrontFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange(setIdFrontFile, 'idFrontFile')}
                    className="hidden"
                  />
                  {idFrontFile && <span className="text-xs text-textSecondary">{idFrontFile.name}</span>}
                  {!idFrontFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>
                {fieldErrors.idFrontFile && <p className={errorTextClass}>{fieldErrors.idFrontFile}</p>}

                <div className={fileInputClass('idBackFile')}>
                  <label htmlFor="idBackFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Foto do Documento (Verso)</span>
                  </label>
                  <input
                    id="idBackFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange(setIdBackFile, 'idBackFile')}
                    className="hidden"
                  />
                  {idBackFile && <span className="text-xs text-textSecondary">{idBackFile.name}</span>}
                  {!idBackFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>
                {fieldErrors.idBackFile && <p className={errorTextClass}>{fieldErrors.idBackFile}</p>}

                <div className={fileInputClass('proofOfAddressFile')}>
                  <label htmlFor="proofOfAddressFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>Comprovante de Endereço</span>
                  </label>
                  <input
                    id="proofOfAddressFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange(setProofOfAddressFile, 'proofOfAddressFile')}
                    className="hidden"
                  />
                  {proofOfAddressFile && <span className="text-xs text-textSecondary">{proofOfAddressFile.name}</span>}
                  {!proofOfAddressFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>
                {fieldErrors.proofOfAddressFile && <p className={errorTextClass}>{fieldErrors.proofOfAddressFile}</p>}

                <div className={fileInputClass('selfieWithIdFile')}>
                  <label htmlFor="selfieWithIdFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <Camera className="w-5 h-5 text-primary" />
                    <span>Selfie com Documento</span>
                  </label>
                  <input
                    id="selfieWithIdFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange(setSelfieWithIdFile, 'selfieWithIdFile')}
                    className="hidden"
                  />
                  {selfieWithIdFile && <span className="text-xs text-textSecondary">{selfieWithIdFile.name}</span>}
                  {!selfieWithIdFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>
                {fieldErrors.selfieWithIdFile && <p className={errorTextClass}>{fieldErrors.selfieWithIdFile}</p>}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-semibold hover:from-primary/80 hover:to-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-6 text-center flex-shrink-0"> {/* Footer */}
          <button
            onClick={onToggle}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Já tem uma conta? Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
