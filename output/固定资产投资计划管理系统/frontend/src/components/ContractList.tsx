// [generated]
import React, { useState, useEffect } from 'react';
import { fetchContracts } from '../services/api';

interface Contract {
  id: number;
  contractNo: string;
  name: string;
  status: string;
}

const ContractList: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  useEffect(() => {
    fetchContracts().then(data => setContracts(data)).catch(console.error);
  }, []);

  return (
    <div className="bg-white rounded shadow p-6">
      <h1 className="text-xl font-bold mb-4">合同列表</h1>
      <ul>
        {contracts.map(ct => (
          <li key={ct.id} className="border-b py-2">
            {ct.contractNo} - {ct.name} - {ct.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContractList;