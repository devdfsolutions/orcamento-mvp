{/* Lista */}
<section>
  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse',
      background: '#fff',
      tableLayout: 'fixed',
    }}
  >
    <colgroup>
      <col style={{ width: '25%' }} /> {/* Produto/Serviço */}
      <col style={{ width: '20%' }} /> {/* Fornecedor */}
      <col style={{ width: '10%' }} /> {/* UM */}
      <col style={{ width: 70 }} /> {/* P1 */}
      <col style={{ width: 70 }} /> {/* P2 */}
      <col style={{ width: 70 }} /> {/* P3 */}
      <col style={{ width: 70 }} /> {/* M1 */}
      <col style={{ width: 70 }} /> {/* M2 */}
      <col style={{ width: 70 }} /> {/* M3 */}
      <col style={{ width: '20%' }} /> {/* Atualização */}
      <col style={{ width: '15%' }} /> {/* Obs */}
      <col style={{ width: '12%' }} /> {/* Ações */}
    </colgroup>
    <thead>
      <tr>
        <th style={th}>Produto/Serviço</th>
        <th style={th}>Fornecedor</th>
        <th style={{ ...th, textAlign: 'center' }}>UM</th>
        <th style={{ ...th, textAlign: 'right' }}>P1</th>
        <th style={{ ...th, textAlign: 'right' }}>P2</th>
        <th style={{ ...th, textAlign: 'right' }}>P3</th>
        <th style={{ ...th, textAlign: 'right' }}>M1</th>
        <th style={{ ...th, textAlign: 'right' }}>M2</th>
        <th style={{ ...th, textAlign: 'right' }}>M3</th>
        <th style={th}>Atualização</th>
        <th style={th}>Obs</th>
        <th style={th}></th>
      </tr>
    </thead>
    <tbody>
      {vinculos.map((v) => {
        const safeV = {
          ...v,
          precoMatP1: v.precoMatP1 ? Number(v.precoMatP1) : null,
          precoMatP2: v.precoMatP2 ? Number(v.precoMatP2) : null,
          precoMatP3: v.precoMatP3 ? Number(v.precoMatP3) : null,
          precoMoM1: v.precoMoM1 ? Number(v.precoMoM1) : null,
          precoMoM2: v.precoMoM2 ? Number(v.precoMoM2) : null,
          precoMoM3: v.precoMoM3 ? Number(v.precoMoM3) : null,
        };
        return (
          <InlineVinculoRow
            key={v.id}
            v={safeV}
            onSubmit={upsertVinculo}
            onDelete={excluirVinculo}
          />
        );
      })}

      {vinculos.length === 0 && (
        <tr>
          <td style={td} colSpan={12}>
            Nenhum vínculo cadastrado.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</section>
