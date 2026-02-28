import { useFormContext } from '../../context/FormContext.js';
import FormField from '../../components/FormField.js';
import { formatPhone, formatRRN } from '../../utils/formatters.js';
import { openAddressSearch } from '../../utils/daumPostcode.js';

interface Props {
  getFieldError?: (field: string) => string | undefined;
}

export default function Step3Inventor({ getFieldError }: Props) {
  const { state, dispatch } = useFormContext();

  return (
    <div className="step-content">
      <div className="card">
        <div className="card-head">
          <h2>발명자 정보</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => dispatch({ type: 'COPY_APPLICANTS_TO_INVENTORS' })}
            >
              출원인에서 복사
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => dispatch({ type: 'ADD_INVENTOR' })}
            >
              + 발명자 추가
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="info-box blue" style={{ marginBottom: '16px' }}>
            발명자는 자연인(개인)만 가능합니다. 발명자와 출원인이 동일한 경우 "출원인에서 복사" 버튼으로 간편하게 입력할 수 있습니다.
          </div>

          {state.inventors.map((inventor, idx) => (
            <div key={inventor.id} className="person-card" style={{ marginBottom: '12px' }}>
              <div className="person-card-header">
                <div className="person-card-title">
                  <span className="person-num">{idx + 1}</span>
                  <span className="person-name">{inventor.nameKr || `발명자 ${idx + 1}`}</span>
                </div>
                {state.inventors.length > 1 && (
                  <button
                    type="button"
                    className="btn-icon btn-remove"
                    onClick={() => dispatch({ type: 'REMOVE_INVENTOR', id: inventor.id })}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="person-card-body">
                {/* 기본 정보 */}
                <div className="field-row col2">
                  <FormField
                    label="성명 (국문)"
                    required
                    value={inventor.nameKr}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { nameKr: e.target.value },
                    })}
                    placeholder="발명자 성명"
                    error={getFieldError?.(`inventors.${idx}.nameKr`)}
                  />
                  <FormField
                    label="성명 (영문)"
                    value={inventor.nameEn}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { nameEn: e.target.value },
                    })}
                    placeholder="English Name"
                    helpText="예시) Hong, Gil Dong"
                  />
                </div>

                <div className="field-row col3">
                  <FormField
                    label="주민등록번호"
                    required
                    value={inventor.rrn}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { rrn: formatRRN(e.target.value) },
                    })}
                    placeholder="123456-1234567"
                    maxLength={14}
                    inputMode="numeric"
                    error={getFieldError?.(`inventors.${idx}.rrn`)}
                  />
                  <FormField
                    label="전화번호"
                    type="tel"
                    inputMode="tel"
                    value={inventor.phone}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { phone: formatPhone(e.target.value) },
                    })}
                    placeholder="010-1234-5678"
                    maxLength={13}
                    autoComplete="tel"
                  />
                  <FormField
                    label="이메일"
                    type="email"
                    inputMode="email"
                    value={inventor.email}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: { email: e.target.value },
                    })}
                    placeholder="email@example.com"
                    autoComplete="email"
                  />
                </div>

                {/* 주소 */}
                <div className="field-section" style={{ marginTop: '16px' }}>
                  <h4 className="section-subtitle">
                    주소 <span style={{ fontSize: '12px', fontWeight: 400, color: '#e67700' }}>※ 주민등록등본상 주소지를 입력해 주세요</span>
                  </h4>
                  <div className="field-row">
                    <div className="field-group" style={{ flex: 1 }}>
                      <label className="field-label">우편번호</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          className="field-input"
                          value={inventor.address.zipcode}
                          readOnly
                          inputMode="numeric"
                          placeholder="우편번호"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={async () => {
                          try {
                            const addr = await openAddressSearch();
                            dispatch({
                              type: 'UPDATE_INVENTOR',
                              id: inventor.id,
                              data: { address: { ...addr, detailAddr: inventor.address.detailAddr } },
                            });
                          } catch { /* 닫기 */ }
                        }}
                        >
                          주소검색
                        </button>
                      </div>
                    </div>
                  </div>
                  <FormField
                    label="도로명 주소"
                    value={inventor.address.roadAddr}
                    readOnly
                    placeholder="주소 검색 시 자동 입력"
                  />
                  <FormField
                    label="상세 주소"
                    value={inventor.address.detailAddr}
                    onChange={(e) => dispatch({
                      type: 'UPDATE_INVENTOR',
                      id: inventor.id,
                      data: {
                        address: { ...inventor.address, detailAddr: e.target.value },
                      },
                    })}
                    placeholder="동/호수 등 상세 주소"
                  />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '12px 0' }}>
                    <input
                      type="checkbox"
                      checked={inventor.useMailAddress}
                      onChange={(e) => dispatch({
                        type: 'UPDATE_INVENTOR',
                        id: inventor.id,
                        data: { useMailAddress: e.target.checked },
                      })}
                    />
                    우편물 수령지 동일
                  </label>

                  {!inventor.useMailAddress && (
                    <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                      <h5 style={{ marginBottom: '8px' }}>우편물 수령 주소</h5>
                      <div className="field-row">
                        <div className="field-group" style={{ flex: 1 }}>
                          <label className="field-label">우편번호</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              className="field-input"
                              value={inventor.mailAddress.zipcode}
                              readOnly
                              inputMode="numeric"
                              placeholder="우편번호"
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ whiteSpace: 'nowrap' }}
                              onClick={async () => {
                                try {
                                  const addr = await openAddressSearch();
                                  dispatch({
                                    type: 'UPDATE_INVENTOR',
                                    id: inventor.id,
                                    data: { mailAddress: { ...addr, detailAddr: inventor.mailAddress.detailAddr } },
                                  });
                                } catch { /* 닫기 */ }
                              }}
                            >
                              주소검색
                            </button>
                          </div>
                        </div>
                      </div>
                      <FormField
                        label="도로명 주소"
                        value={inventor.mailAddress.roadAddr}
                        readOnly
                        placeholder="주소 검색 시 자동 입력"
                      />
                      <FormField
                        label="상세 주소"
                        value={inventor.mailAddress.detailAddr}
                        onChange={(e) => dispatch({
                          type: 'UPDATE_INVENTOR',
                          id: inventor.id,
                          data: {
                            mailAddress: { ...inventor.mailAddress, detailAddr: e.target.value },
                          },
                        })}
                        placeholder="우편물 수령 주소"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
