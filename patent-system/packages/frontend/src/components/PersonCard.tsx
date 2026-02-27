import { useState } from 'react';
import {
  Applicant,
  PersonType,
  PERSON_TYPE_LABELS,
  NATIONALITY_OPTIONS,
} from '../types/index.js';
import FormField, { SelectField } from './FormField.js';
import { formatPhone, formatRRN, formatBizNum, formatCorpRegNum } from '../utils/formatters.js';
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
        `${prefix}.nameEn`,
      ].some(f => getFieldError(f))
    : false;

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
          <div className="type-grid">
            {(Object.entries(PERSON_TYPE_LABELS) as [PersonType, string][]).map(([type, label]) => (
              <div
                key={type}
                className={`type-item ${personType === type ? 'selected' : ''}`}
                onClick={() => onUpdate({ personType: type })}
              >
                {label}
              </div>
            ))}
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
                  error={getFieldError?.(`${prefix}.rrn`)}
                />
              </div>
              <div className="field-row col2">
                <SelectField
                  label="국적"
                  value={applicant.nationality}
                  onChange={(e) => onUpdate({ nationality: e.target.value })}
                  options={NATIONALITY_OPTIONS}
                />
              </div>
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
                  error={getFieldError?.(`${prefix}.corpRegNum`)}
                />
                <FormField
                  label="사업자등록번호"
                  required
                  value={applicant.bizNum}
                  onChange={(e) => onUpdate({ bizNum: formatBizNum(e.target.value) })}
                  placeholder="123-45-67890"
                  maxLength={12}
                  error={getFieldError?.(`${prefix}.bizNum`)}
                />
              </div>
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
            <h4 className="section-subtitle">주소</h4>
            <div className="field-row">
              <div className="field-group" style={{ flex: 1 }}>
                <label className="field-label">우편번호</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="field-input"
                    value={applicant.address.zipcode}
                    readOnly
                    placeholder="우편번호"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddressSearch}
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
                checked={!applicant.useMailAddress}
                onChange={(e) => onUpdate({ useMailAddress: !e.target.checked })}
              />
              우편물 수령지 동일
            </label>

            {applicant.useMailAddress && (
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
                        placeholder="우편번호"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleMailAddressSearch}
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

          {/* 연락처 (공통) */}
          <div className="field-section">
            <h4 className="section-subtitle">연락처</h4>
            <div className="field-row col2">
              <FormField
                label="전화번호"
                type="tel"
                value={applicant.phone}
                onChange={(e) => onUpdate({ phone: formatPhone(e.target.value) })}
                placeholder="010-1234-5678"
                maxLength={13}
              />
              <FormField
                label="이메일"
                type="email"
                value={applicant.email}
                onChange={(e) => onUpdate({ email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
