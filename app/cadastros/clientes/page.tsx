<section style={card}>
  <h2 style={h2}>Novo cliente</h2>

  <form
    action={criarClienteUsuario}
    style={{
      display: 'grid',
      gap: 8,
      gridTemplateColumns: '2fr 1fr 1fr 1fr',
      alignItems: 'center',
    }}
  >
    <input type="hidden" name="usuarioId" value={me.id} />

    <input
      name="nome"
      placeholder="Nome"
      required
      style={{ ...input, gridColumn: '1 / span 1' }}
    />

    {/* CPF com máscara */}
    <input
      id="cpf"
      name="cpf"
      placeholder="CPF (opcional)"
      maxLength={14}
      style={input}
      onInput={(e) => {
        const target = e.currentTarget;
        let v = target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        target.value = v;
      }}
    />

    {/* CNPJ com máscara */}
    <input
      id="cnpj"
      name="cnpj"
      placeholder="CNPJ (opcional)"
      maxLength={18}
      style={input}
      onInput={(e) => {
        const target = e.currentTarget;
        let v = target.value.replace(/\D/g, '');
        if (v.length > 14) v = v.slice(0, 14);
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
        target.value = v;
      }}
    />

    <input
      name="email"
      placeholder="E-mail (opcional)"
      style={{ ...input, gridColumn: '1 / span 1' }}
    />
    <input
      name="telefone"
      placeholder="Telefone (opcional)"
      style={input}
    />

    {/* Campo CEP */}
    <input
      id="cep"
      name="cep"
      placeholder="CEP (opcional)"
      maxLength={9}
      style={input}
      onInput={(e) => {
        const target = e.currentTarget;
        let v = target.value.replace(/\D/g, '');
        if (v.length > 8) v = v.slice(0, 8);
        if (v.length > 5) v = v.replace(/(\d{5})(\d)/, '$1-$2');
        target.value = v;
      }}
      onBlur={async (e) => {
        const cep = e.currentTarget.value.replace(/\D/g, '');
        if (cep.length === 8) {
          try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
              const endereco = [
                data.logradouro,
                data.bairro,
                data.localidade,
                data.uf,
              ]
                .filter(Boolean)
                .join(', ');
              const enderecoInput = document.querySelector<HTMLInputElement>(
                'input[name="endereco"]'
              );
              if (enderecoInput) enderecoInput.value = endereco;
            }
          } catch (err) {
            console.warn('Erro ao buscar CEP', err);
          }
        }
      }}
    />

    <input
      name="endereco"
      placeholder="Endereço (opcional)"
      style={{ ...input, gridColumn: '1 / span 3' }}
    />

    <div
      style={{
        gridColumn: '1 / span 4',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <button style={btn}>Adicionar Novo</button>
    </div>
  </form>
</section>
