"use client";

import { useState } from "react";
import { EnderecoAssistFields } from "@/components/locais/endereco-assist-fields";
import { locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";

type Props = {
  localLogoUrl?: string | null;
};

export function CadastrarLocalEnderecoFields({ localLogoUrl = null }: Props) {
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [complemento, setComplemento] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  return (
    <div className="space-y-2">
      <p className={locaisSectionTitleClass}>Endereço completo do local</p>
      <EnderecoAssistFields
        endereco={endereco}
        setEndereco={setEndereco}
        numero={numero}
        setNumero={setNumero}
        bairro={bairro}
        setBairro={setBairro}
        cidade={cidade}
        setCidade={setCidade}
        estado={estado}
        setEstado={setEstado}
        cep={cep}
        setCep={setCep}
        complemento={complemento}
        setComplemento={setComplemento}
        lat={lat}
        lng={lng}
        onCoords={(nextLat, nextLng) => {
          setLat(nextLat);
          setLng(nextLng);
        }}
        localLogoUrl={localLogoUrl}
      />
    </div>
  );
}
