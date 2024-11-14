'use client';
import { useState } from 'react';

export default function JWTDecoder() {
  const [jwt, setJwt] = useState('');
  const [decodedHeader, setDecodedHeader] = useState('');
  const [decodedPayload, setDecodedPayload] = useState('');

  const decodeJWT = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      setDecodedHeader(JSON.stringify(header, null, 2));
      setDecodedPayload(JSON.stringify(payload, null, 2));
    } catch (error) {
      setDecodedHeader('Error decoding header');
      setDecodedPayload('Error decoding payload');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">JWT Decoder</h1>
      <div className="mb-4">
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="Paste your JWT here"
          value={jwt}
          onChange={(e) => {
            setJwt(e.target.value);
            decodeJWT(e.target.value);
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Header</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {decodedHeader}
          </pre>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Payload</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {decodedPayload}
          </pre>
        </div>
      </div>
    </div>
  );
}
