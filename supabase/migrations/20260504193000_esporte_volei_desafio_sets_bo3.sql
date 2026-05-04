-- Vôlei (desafio/ranking): melhor de 3 sets, 21/21/15 com vantagem de 2, sem TB estilo tênis nos dois primeiros.
update public.esportes
set
  desafio_modo_lancamento = 'sets',
  desafio_regras_placar_json = jsonb_build_object(
    'minPlacar',
    0,
    'maxPlacar',
    2,
    'permitirEmpate',
    false,
    'permitirWO',
    true,
    'variantes',
    jsonb_build_array(
      jsonb_build_object(
        'key',
        'bo3_rally_21_15',
        'label',
        'Melhor de 3 sets (21/21/15, vantagem de 2)',
        'minPlacar',
        0,
        'maxPlacar',
        2,
        'permitirEmpate',
        false,
        'permitirWO',
        true,
        'sets_to_win',
        2,
        'games_per_set',
        21,
        'tiebreak',
        false,
        'tiebreak_points',
        7,
        'final_set_super_tiebreak',
        true,
        'final_set_target_points',
        15,
        'win_by_two',
        true
      )
    )
  )
where slug = 'volei';
