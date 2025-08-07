import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { db } from './firebase';

// 한번에 import하세요
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';

const GlobalStyle = createGlobalStyle`
  body {
    background: #ffffff;
    font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
    margin: 0;
    min-height: 100vh;
  }
`;

const Container = styled.div`
  max-width: 95vw;
  margin: 20px auto;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
`;

const Title = styled.h1`
  color: #1e3a8a;
  text-align: center;
  margin-bottom: 40px;
  font-size: 2.8rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(30, 58, 138, 0.15);
  table-layout: fixed;
`;

const Th = styled.th`
  background: #1e3a8a;
  color: #fff;
  padding: 16px 8px;
  font-weight: 700;
  font-size: 0.9rem;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  &:last-child { border-right: none; }
  
  &:nth-child(1) { width: 8%; } /* 이름 */
  &:nth-child(2) { width: 8%; } /* 입사일 */
  &:nth-child(3) { width: 6%; } /* 총 휴가 */
  &:nth-child(4) { width: 6%; } /* 남은 휴가 */
  &:nth-child(n+5) { width: 6%; } /* 월별 셀들 */
`;

const Td = styled.td`
  padding: 12px 8px;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  font-size: 0.9rem;
  &:nth-child(1) { 
    font-weight: 600; 
    color: #1e3a8a; 
    background: #eff6ff;
  }
  &:nth-child(2) { color: #6b7280; }
  &:nth-child(6) { 
    font-weight: 600; 
    color: #059669; 
    background: #f0fdf4;
  }
`;

const MonthCell = styled.td<{editable: boolean}>`
  background: ${({ editable }) => (editable ? '#dbeafe' : '#f8fafc')};
  cursor: ${({ editable }) => (editable ? 'pointer' : 'default')};
  transition: all 0.2s;
  padding: 8px 4px;
  font-size: 0.85rem;
  width: 6%;
  
  &:hover {
    background: ${({ editable }) => (editable ? '#bfdbfe' : '#f1f5f9')};
  }
`;

const Input = styled.textarea`
  width: 80px;
  height: 60px;
  padding: 4px 6px;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  font-size: 0.8rem;
  text-align: center;
  background: #fff;
  color: #1e3a8a;
  resize: none;
  font-family: inherit;
`;

const InfoText = styled.div`
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 20px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 8px;
`;

// 구성원
const initialMembers = [
  { name: '박시은', joinDate: '2024-01-01', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
  { name: '유혜종', joinDate: '2024-06-01', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
  { name: '고채린', joinDate: '2024-06-18', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
  { name: '김나영', joinDate: '2024-09-02', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
  { name: '조운지', joinDate: '2025-03-12', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
  { name: '박윤하', joinDate: '2025-04-01', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
  { name: '문지혜', joinDate: '2025-05-26', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
  { name: '서예람', joinDate: '2025-06-01', totalVacation: 0, carryoverVacation: 0, remaining: 0, months: Array(12).fill(0).map(() => ({ days: '', count: 0 })) },
];

type Member = typeof initialMembers[0];

type EditState = {
  memberIdx: number;
  monthIdx: number;
};

// 근로기준법에 따른 휴가 계산 함수
const calculateVacationDays = (joinDate: string): number => {
  const join = new Date(joinDate);
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // 입사 후 경과 개월 수 계산
  const monthsDiff = (currentYear - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
  
  // 1년 미만 근로자 (입사 후 1개월부터 매달 1일씩, 최대 11일)
  if (monthsDiff < 12) {
    return Math.min(monthsDiff, 11);
  }
  
  // 1년 이상 근로자
  const yearsWorked = Math.floor(monthsDiff / 12);
  
  // 기본 15일
  let vacationDays = 15;
  
  // 3년차부터는 2년에 1일씩 추가 (최대 25일까지)
  if (yearsWorked >= 3) {
    const additionalDays = Math.floor((yearsWorked - 2) / 2);
    vacationDays = Math.min(15 + additionalDays, 25);
  }
  
  return vacationDays;
};

function App() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Firestore에서 데이터 불러오기
  useEffect(() => {
    async function fetchData() {
      const snapshot = await getDocs(collection(db, 'members'));
      if (!snapshot.empty) {
        const arr = snapshot.docs.map(doc => doc.data() as Member);
        // 기존 데이터가 있지만 새로운 멤버들을 포함하도록 병합
        const existingMembers = new Map(arr.map(member => [member.name, member]));
        const allMembers = initialMembers.map(member => {
          const existing = existingMembers.get(member.name);
          if (existing) {
            return {existing,
                joinDate: member.joinDate,
            };
          } else {
            // 새로운 멤버는 초기값으로 설정
            const totalVacation = calculateVacationDays(member.joinDate);
            return {
              ...member,
              totalVacation,
              remaining: totalVacation
            };
          }
        });
        // allMembers 배열이 Member 타입 배열이 되도록 변환
        setMembers(
          allMembers.map(item => {
            if ('existing' in item && item.existing) {
              // 기존 멤버 정보와 joinDate를 병합
              return {
                ...item.existing,
                joinDate: item.joinDate, // Firestore에 저장된 joinDate가 아닌, initialMembers의 joinDate 사용
              };
            }
            // 기존 멤버가 아니면 그대로 반환
            return item;
          })
        );

      
        // 삭제 대상 찾기: Firestore에는 있는데 initialMembers에는 없는 경우
      const initialNames = new Set(initialMembers.map(m => m.name));
      const toDelete = arr.filter(m => !initialNames.has(m.name));

      // Firestore에서 삭제
      for (const member of toDelete) {
        const docRef = snapshot.docs.find(doc => doc.data().name === member.name);
        if (docRef) {
          await deleteDoc(doc(db, 'members', docRef.id));
        }
      }
      } else {
        // Firestore에 데이터가 없으면 초기값 사용
        setMembers(initialMembers.map(member => {
          const totalVacation = calculateVacationDays(member.joinDate);
          return {
            ...member,
            totalVacation,
            remaining: totalVacation
          };
        }));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // members가 바뀔 때마다 Firestore에 저장
  useEffect(() => {
    if (members) {
      members.forEach(async (member, idx) => {
        await setDoc(doc(db, 'members', String(idx)), member);
      });
    }
  }, [members]);

  // 날짜 문자열을 파싱하여 개수 계산 (반차 지원)
  const parseDaysToCount = (daysStr: string): number => {
    if (!daysStr.trim()) return 0;
    const days = daysStr.split(',').map(d => d.trim()).filter(d => d);
    let totalCount = 0;
    
    days.forEach(day => {
      if (day.endsWith('*')) {
        // 반차: 0.5일
        totalCount += 0.5;
      } else {
        // 일반 휴가: 1일
        totalCount += 1;
      }
    });
    
    return totalCount;
  };

  // 멤버의 총 사용 휴가 계산
  const calculateTotalUsed = (member: Member): number => {
    return member.months.reduce((total, month) => total + month.count, 0);
  };

  // 총 휴가 계산 (발생휴가 + 이월휴가)
  const getTotalVacation = (member: Member) => {
    return member.totalVacation + (member.carryoverVacation || 0);
  };

  // 남은 휴가 계산 함수 수정
  const getRemaining = (member: Member) => {
    return getTotalVacation(member) - calculateTotalUsed(member);
  };

  const handleCellClick = (memberIdx: number, monthIdx: number) => {
    if (!members) return;
    setEdit({ memberIdx, monthIdx });
    setInputValue(members[memberIdx].months[monthIdx].days);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (edit && members) {
      const newCount = parseDaysToCount(inputValue);
      setMembers(prev => {
        if (!prev) return prev;
        const updated = [...prev];
        const member = { ...updated[edit.memberIdx] };
        member.months = [...member.months];
        member.months[edit.monthIdx] = {
          days: inputValue,
          count: newCount
        };
        // 남은 휴가 재계산
        const totalUsed = member.months.reduce((total, month) => total + month.count, 0);
        member.remaining = member.totalVacation - totalUsed;
        updated[edit.memberIdx] = member;
        return updated;
      });
      setEdit(null);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleInputBlur();
    }
  };

  // 이월휴가 입력 처리 함수
  const handleCarryoverChange = (memberIdx: number, value: string) => {
    if (!members) return;
    const carryoverValue = parseFloat(value) || 0;
    
    setMembers(prev => {
      if (!prev) return prev;
      const updated = [...prev];
      const member = { ...updated[memberIdx] };
      member.carryoverVacation = carryoverValue;
      updated[memberIdx] = member;
      return updated;
    });
  };

  // 렌더링 시 members가 null이면 로딩 메시지, 아니면 map 사용
  if (loading || !members) {
    return <div style={{textAlign: 'center', marginTop: '100px'}}>로딩 중...</div>;
  }

  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>🏖️ 랩포디엑스 휴가 관리 대시보드</Title>
        <InfoText>
          💡 월별 셀을 클릭하여 휴가 사용일을 입력하세요. 여러 날짜는 쉼표(,)로 구분하세요. 반차는 날짜 뒤에 *를 붙이세요. (예: 15, 22*, 29)
        </InfoText>
        <Table>
          <thead>
            <tr>
              <Th>이름</Th>
              <Th>입사일</Th>
              <Th>발생 휴가</Th>
              <Th>이월 휴가</Th>
              <Th>남은 휴가</Th>
              {Array.from({ length: 12 }, (_, i) => (
                <Th key={i}>{i + 1}월</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members && members.map((member, memberIdx) => (
              <tr key={member.name}>
                <Td>{member.name}</Td>
                <Td>{member.joinDate}</Td>
                <Td>{member.totalVacation}일</Td>
                <Td>
                  <input
                    type="number"
                    value={member.carryoverVacation || 0}
                    onChange={(e) => handleCarryoverChange(memberIdx, e.target.value)}
                    style={{ width: '60px', height: '30px', fontSize: '0.8rem', textAlign: 'center', border: '1px solid #ccc', borderRadius: '4px' }}
                    placeholder="0"
                  />
                </Td>
                <Td>{getRemaining(member)}일</Td>
                {member.months.map((month, monthIdx) => (
                  <MonthCell
                    key={monthIdx}
                    editable={true}
                    onClick={() => handleCellClick(memberIdx, monthIdx)}
                  >
                    {edit && edit.memberIdx === memberIdx && edit.monthIdx === monthIdx ? (
                      <Input
                        autoFocus
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        placeholder="날짜 입력"
                      />
                    ) : (
                      <div>
                        <div style={{ color: '#1e3a8a', fontWeight: 500, marginBottom: '4px' }}>
                          {month.days || '-'}
                        </div>
                        <div style={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem' }}>
                          {month.count}회
                        </div>
                      </div>
                    )}
                  </MonthCell>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Container>
    </>
  );
}

export default App;
