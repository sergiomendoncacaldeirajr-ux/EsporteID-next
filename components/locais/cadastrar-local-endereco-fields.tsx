"use client";

import { useState } from "react";
import { EnderecoAssistFields } from "@/components/locais/endereco-assist-fields";
import { locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";

export type EnderecoInitialValues = {
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  complemento?: string;
  lat?: string;
  lng?: string;
};

type Props = {
  localLogoUrl?: string | null;
  initialValues?: EnderecoInitialValues;
};

export function CadastrarLocalEnderecoFields({ localLogoUrl = null, initialValues }: Props) {
  const [endereco, setEndereco] = useState(initialValues?.endereco ?? "");
  const [numero, setNumero] = useState(initialValues?.numero ?? "");
  const [bairro, setBairro] = useState(initialValues?.bairro ?? "");
  const [cidade, setCidade] = useState(initialValues?.cidade ?? "");
  const [estado, setEstado] = useState(initialValues?.estado ?? "");
  const [cep, setCep] = useState(initialValues?.cep ?? "");
  const [complemento, setComplemento] = useState(initialValues?.complemento ?? "");
  const [lat, setLat] = useState(initialValues?.lat ?? "");
  const [lng, setLng] = useState(initialValues?.lng ?? "");

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
