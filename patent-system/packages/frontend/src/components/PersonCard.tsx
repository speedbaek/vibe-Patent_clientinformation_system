import { useState } from 'react';
import {
  Applicant,
  PersonType,
  PERSON_TYPE_LABELS,
  NATIONALITY_OPTIONS,
} from '../types/index.js';

const OTHER_TYPES: PersonType[] = ['govt', 'foreign_corp', 'foreign_individual', 'association'];
const OTHER_OPTIONS: { value: PersonType; label: string }[] = [
  { value: 'govt', label: '국가/지방자치단체' },
  { value: 'foreign_corp', label: '외국 법인' },
  { value: 'foreign_individual', label: '외국 자연인 (개인)' },
  { value: 'association', label: '사단/재단법인' },
];
import FormField, { SelectField } from './FormField.js';
import { formatRRN, formatBizNum, formatCorpRegNum } from '../utils/formatters.js';
import { openAddressSearch } from '../utils/daumPostcode.js';

interface PersonCardProps {
  applicant: Applicant;
  index: number;
  canRemove: boolean;
  onUpdate: (data: Partial<Applicant>) => void;
  onRemove: () => void;
  getFieldError?: (field: string) => string | undefined;
}

export default function PersonCard({
  applicant,
  index,
  canRemove,
  onUpdate,
  onRemove,
  getFieldError,
}: PersonCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { personType } = applicant;

  const isIndividual = personType === 'domestic_individual' || personType === 'foreign_individual';
  const isCorp = personType === 'domestic_corp' || personType === 'foreign_corp' || personType === 'govt' || personType === 'association';
  const isForeign = personType === 'foreign_individual' || personType === 'foreign_corp';

  const displayName = isIndividual
    ? applicant.nameKr || applicant.nameEn || `출원인 ${index + 1}`
    : applicant.corpName || `출원인 ${index + 1}`;

  const prefix = `applicants.${index}`;

  const hasErrors = getFieldError
    ? [
        `${prefix}.nameKr`, `${prefix}.rrn`, `${prefix}.corpName`,
        `${prefix}.ceoName`, `${prefix}.corpRegNum`, `${prefix}.bizNum`,
        `${prefix}.nameEn`, `${prefix}.bizLicense`,
      ].some(f => getFieldError(f))
    : false;

  function handleBizLicenseUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하만 가능합니다.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({
        bizLicenseDataUrl: reader.result as string,
        bizLicenseFileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleAddressSearch() {
    try {
      const addr = await openAddressSearch();
      onUpdate({ address: { ...addr, detailAddr: applicant.address.detailAddr } });
    } catch { /* 사용자가 닫은 경우 무시 */ }
  }

  async function handleMailAddressSearch() {
    try {
      const addr = await openAddressSearch();
      onUpdate({ mailAddress: { ...addr, detailAddr: applicant.mailAddress.detailAddr } });
    } catch { /* 사용자가 닫은 경우 무시 */ }
  }

  return (
    <div className={`person-card ${hasErrors ? 'person-card-error' : ''}`}>
      <div className="person-card-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="person-card-title">
          <span className="person-num">{index + 1}</span>
          <span className="person-name">{displayName}</span>
          <span className="person-type-badge">{PERSON_TYPE_LABELS[personType]}</span>
          {hasErrors && <span className="person-error-badge">입력 필요</span>}
        </div>
        <div className="person-card-actions">
          {canRemove && (
            <button
              type="button"
              className="btn-icon btn-remove"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title="삭제"
            >
              ✕
            </button>
          )}
          <span className={`collapse-icon ${collapsed ? 'collapsed' : ''}`}>▼</span>
        </div>
      </div>

      {!collapsed && (
        <div className="person-card-body">
          {/* 출원인 유형 선택 */}
          <div className="type-grid type-grid-3">
            <div
              className={`type-item ${personType === 'domestic_individual' ? 'selected' : ''}`}
              onClick={() => onUpdate({ personType: 'domestic_individual' })}
            >
              국내 자연인(개인)
            </div>
            <div
              className={`type-item ${personType === 'domestic_corp' ? 'selected' : ''}`}
              onClick={() => onUpdate({ personType: 'domestic_corp' })}
            >
              국내 법인
            </div>
            <div
              className={`type-item type-item-select ${OTHER_TYPES.includes(personType) ? 'selected' : ''}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <span style={{ pointerEvents: 'none' }}>
                {OTHER_TYPES.includes(personType)
                  ? (OTHER_OPTIONS.find((o) => o.value === personType)?.label ?? '기타')
                  : '기타 ▾'}
              </span>
              <select
                value={OTHER_TYPES.includes(personType) ? personType : ''}
                onChange={(e) => onUpdate({ personType: e.target.value as PersonType })}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                }}
              >
                <option value="" disabled />
                {OTHER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6', marginTop: '6px' }}>
            <div>※ 개인사업자는 "개인"을 선택하셔서 인적사항 작성 바랍니다.</div>
            <div>※ 법인사업자의 경우 "사업자등록증" 첨부가 필수로 요구되니, 미리 준비 부탁 드립니다.</div>
          </div>

          {/* 개인 필드 */}
          {isIndividual && (
            <div className="field-section">
              <div className="field-row col2">
                <FormField
                  label="성명"
                  required
                  value={applicant.nameKr}
                  onChange={(e) => onUpdate({ nameKr: e.target.value })}
                  placeholder="홍길동"
                  error={getFieldError?.(`${prefix}.nameKr`)}
                />
                <FormField
                  label="주민등록번호"
                  required
                  value={applicant.rrn}
                  onChange={(e) => onUpdate({ rrn: formatRRN(e.target.value) })}
                  placeholder="123456-1234567"
                  maxLength={14}
                  inputMode="numeric"
                  error={getFieldError?.(`${prefix}.rrn`)}
                />
              </div>
              {personType === 'domestic_individual' && (
                <div className="field-row col2">
                  <FormField
                    label="영문 성명"
                    required
                    value={applicant.nameEn}
                    onChange={(e) => onUpdate({ nameEn: e.target.value })}
                    placeholder="English Name"
                    helpText="예시) Hong, Gil Dong"
                    error={getFieldError?.(`${prefix}.nameEn`)}
                  />
                </div>
              )}
              {personType === 'foreign_individual' && (
                <div className="field-row col2">
                  <SelectField
                    label="국적"
                    value={applicant.nationality}
                    onChange={(e) => onUpdate({ nationality: e.target.value })}
                    options={NATIONALITY_OPTIONS}
                  />
                </div>
              )}
            </div>
          )}

          {/* 법인 필드 */}
          {isCorp && (
            <div className="field-section">
              <div className="field-row col2">
                <FormField
                  label="법인명 (단체명)"
                  required
                  value={applicant.corpName}
                  onChange={(e) => onUpdate({ corpName: e.target.value })}
                  placeholder="주식회사 OO"
                  error={getFieldError?.(`${prefix}.corpName`)}
                />
                <FormField
                  label="대표이사 성명"
                  required
                  value={applicant.ceoName}
                  onChange={(e) => onUpdate({ ceoName: e.target.value })}
                  placeholder="대표이사명"
                  error={getFieldError?.(`${prefix}.ceoName`)}
                />
              </div>
              <div className="field-row col2">
                <FormField
                  label="법인등록번호"
                  required
                  value={applicant.corpRegNum}
                  onChange={(e) => onUpdate({ corpRegNum: formatCorpRegNum(e.target.value) })}
                  placeholder="123456-1234567"
                  maxLength={14}
                  inputMode="numeric"
                  error={getFieldError?.(`${prefix}.corpRegNum`)}
                />
                <FormField
                  label="사업자등록번호"
                  required
                  value={applicant.bizNum}
                  onChange={(e) => onUpdate({ bizNum: formatBizNum(e.target.value) })}
                  placeholder="123-45-67890"
                  maxLength={12}
                  inputMode="numeric"
                  error={getFieldError?.(`${prefix}.bizNum`)}
                />
              </div>
              {personType === 'domestic_corp' && (
                <div className="field-row col2">
                  <FormField
                    label="영문 명칭"
                    required
                    value={applicant.nameEn}
                    onChange={(e) => onUpdate({ nameEn: e.target.value })}
                    placeholder="English Corporation Name"
                    helpText="예시) Teheran IP Law Firm"
                    error={getFieldError?.(`${prefix}.nameEn`)}
                  />
                </div>
              )}
              {personType === 'domestic_corp' && (
                <div style={{ marginTop: '8px' }}>
                  <label className="field-label">
                    사업자등록증 <span className="required">*</span>
                  </label>
                  {applicant.bizLicenseFileName ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', background: '#f0f7ff', borderRadius: '8px',
                      border: '1px solid #d0e0f0', fontSize: '13px',
                    }}>
                      <span style={{ flex: 1 }}>📄 {applicant.bizLicenseFileName}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onUpdate({ bizLicenseDataUrl: '', bizLicenseFileName: '' })}
                      >
                        삭제
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', cursor: 'pointer', fontSize: '13px' }}
                      >
                        파일 선택 (이미지/PDF)
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleBizLicenseUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {getFieldError?.(`${prefix}.bizLicense`) && (
                        <div className="field-error" style={{ marginTop: '6px' }}>
                          {getFieldError(`${prefix}.bizLicense`)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 외국인 추가 필드 */}
          {isForeign && (
            <div className="field-section">
              <div className="field-row col2">
                <FormField
                  label="영문 성명"
                  required
                  value={applicant.nameEn}
                  onChange={(e) => onUpdate({ nameEn: e.target.value })}
                  placeholder="English Name"
                  helpText="예시) Hong, Gil Dong"
                  error={getFieldError?.(`${prefix}.nameEn`)}
                />
                <FormField
                  label="여권번호"
                  required
                  value={applicant.passport}
                  onChange={(e) => onUpdate({ passport: e.target.value })}
                  placeholder="여권번호"
                />
              </div>
            </div>
          )}

          {/* 주소 (공통) */}
          <div className="field-section">
            <h4 className="section-subtitle">
              주소 <span style={{ fontSize: '12px', fontWeight: 400, color: '#e67700' }}>※ 주민등록등본상 주소지를 입력해 주세요</span>
            </h4>
            <div className="field-row">
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">우편번호</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="field-input"
                    value={applicant.address.zipcode}
                    readOnly
                    inputMode="numeric"
                    placeholder="우편번호"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddressSearch}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    주소검색
                  </button>
                </div>
              </div>
            </div>
            <FormField
              label="도로명 주소"
              value={applicant.address.roadAddr}
              readOnly
              placeholder="주소 검색 시 자동 입력"
            />
            <FormField
              label="상세 주소"
              value={applicant.address.detailAddr}
              onChange={(e) => onUpdate({
                address: { ...applicant.address, detailAddr: e.target.value }
              })}
              placeholder="동/호수 등 상세 주소"
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '12px 0' }}>
              <input
                type="checkbox"
                checked={applicant.useMailAddress}
                onChange={(e) => onUpdate({ useMailAddress: e.target.checked })}
              />
              우편물 수령지 동일
            </label>

            {!applicant.useMailAddress && (
              <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                <h5 style={{ marginBottom: '8px' }}>우편물 수령 주소</h5>
                <div className="field-row">
                  <div className="field-group" style={{ flex: 1 }}>
                    <label className="field-label">우편번호</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="field-input"
                        value={applicant.mailAddress.zipcode}
                        readOnly
                        inputMode="numeric"
                        placeholder="우편번호"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleMailAddressSearch}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        주소검색
                      </button>
                    </div>
                  </div>
                </div>
                <FormField
                  label="도로명 주소"
                  value={applicant.mailAddress.roadAddr}
                  readOnly
                  placeholder="주소 검색 시 자동 입력"
                />
                <FormField
                  label="상세 주소"
                  value={applicant.mailAddress.detailAddr}
                  onChange={(e) => onUpdate({
                    mailAddress: { ...applicant.mailAddress, detailAddr: e.target.value }
                  })}
                  placeholder="우편물 수령 주소"
                />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
