<?php
/**
 * YZI Webhook Sync — Imoveis
 *
 * Snippet PHP standalone para instalar via plugin Code Snippets no WordPress.
 * Dispara webhooks para o endpoint POST /api/webhook/imoveis da plataforma YZI Hub
 * sempre que um post do CPT de imoveis for criado, atualizado, despublicado ou deletado.
 *
 * Dependencias (configurar em wp-config.php antes de ativar):
 *   define('YZIWS_WEBHOOK_SECRET', 'SEU_SECRET_AQUI');
 *   define('YZIWS_WEBHOOK_URL', 'https://plataforma.yzihub.com/api/webhook/imoveis');
 *   // Opcional: define('YZIWS_CPT', 'imoveis'); // default 'imoveis'
 *
 * @package     YZIHub
 * @author      YZI Hub
 * @version     1.0.0
 * @link        https://plataforma.yzihub.com
 */

// Protege contra acesso direto ao arquivo.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Tenant Jurema Brokers — hardcoded. Nao alterar sem refatorar.
if ( ! defined( 'YZIWS_TENANT_ID' ) ) {
    define( 'YZIWS_TENANT_ID', '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361' );
}

/**
 * Retorna o CPT configurado, com fallback para 'imoveis'.
 *
 * @return string Nome do Custom Post Type a ser monitorado.
 */
function yziws_get_cpt() {
    return defined( 'YZIWS_CPT' ) ? YZIWS_CPT : 'imoveis';
}

/**
 * Verifica se as constantes obrigatorias estao definidas.
 * Registra aviso no error_log uma unica vez (por requisicao) se faltar alguma.
 *
 * @return bool True se pode enviar, False se faltam constantes.
 */
function yziws_can_send() {
    static $checked  = false;
    static $can_send = false;

    if ( $checked ) {
        return $can_send;
    }

    $checked = true;

    if ( ! defined( 'YZIWS_WEBHOOK_SECRET' ) || ! defined( 'YZIWS_WEBHOOK_URL' ) ) {
        error_log( 'YZIWS: missing constants — defina YZIWS_WEBHOOK_SECRET e YZIWS_WEBHOOK_URL em wp-config.php antes de usar o snippet.' );
        $can_send = false;
        return false;
    }

    $can_send = true;
    return true;
}

/**
 * Resolve o identificador unico do imovel.
 * Tenta na ordem: meta 'codigo-do-imovel' (JetEngine real) →
 * meta 'id_imovel' (legacy) → meta '_id_imovel' (legacy underscore) →
 * slug do post → 'post-{ID}'.
 * Trunca para no maximo 100 caracteres.
 *
 * @param WP_Post $post Objeto do post WordPress.
 * @return string Identificador do imovel.
 */
function yziws_get_id_imovel( $post ) {
    $candidates = array(
        get_post_meta( $post->ID, 'codigo-do-imovel', true ),
        get_post_meta( $post->ID, 'id_imovel', true ),
        get_post_meta( $post->ID, '_id_imovel', true ),
    );

    foreach ( $candidates as $candidate ) {
        if ( $candidate === null || $candidate === false ) {
            continue;
        }
        $value = trim( (string) $candidate );
        if ( $value !== '' ) {
            return substr( $value, 0, 100 );
        }
    }

    if ( ! empty( $post->post_name ) ) {
        return substr( $post->post_name, 0, 100 );
    }

    return 'post-' . $post->ID;
}

/**
 * Converte valor numerico do WordPress (pode ser string com formatacao BR) para float.
 * Formatos aceitos: "525.000,00", "525000.00", "525000", 525000.
 * Retorna null se vazio ou nao numerico.
 *
 * @param mixed $value Valor raw do meta field.
 * @return float|null Valor numerico ou null.
 */
function yziws_to_float_or_null( $value ) {
    if ( $value === null || $value === '' || $value === false ) {
        return null;
    }

    $str = (string) $value;
    $str = trim( $str );

    if ( $str === '' ) {
        return null;
    }

    // Normaliza formato brasileiro: "525.000,00" → "525000.00"
    // Remove pontos de milhar somente quando ha virgula decimal presente.
    if ( strpos( $str, ',' ) !== false ) {
        $str = str_replace( '.', '', $str );   // remove separadores de milhar
        $str = str_replace( ',', '.', $str );  // converte virgula decimal para ponto
    }

    if ( ! is_numeric( $str ) ) {
        return null;
    }

    return (float) $str;
}

/**
 * Converte valor de texto do meta field para string ou null.
 *
 * @param mixed $value Valor raw do meta field.
 * @return string|null String com trim aplicado ou null.
 */
function yziws_to_string_or_null( $value ) {
    if ( $value === null || $value === false ) {
        return null;
    }

    $str = trim( (string) $value );

    return $str === '' ? null : $str;
}

/**
 * Constroi o objeto 'data' do payload imovel.upsert com os 16 campos do JetEngine.
 * Campos de texto retornam string|null.
 * metragem e valor retornam float|null (obrigatorio para evitar HTTP 422).
 * quartos, suites, vagas retornam string|null (compativel com schema text do Supabase).
 * Chaves com valor null sao omitidas do array (payload enxuto).
 *
 * @param int $post_id ID do post WordPress.
 * @return array Array de dados do imovel (pode ser vazio).
 */
function yziws_build_data_payload( $post_id ) {
    // Mapeamento: chave_payload => nome_meta_field_jetengine
    $text_fields = array(
        'titulo_comercial'  => 'titulo_comercial',
        'titulo_seo'        => 'titulo_seo',
        'descricao_imovel'  => 'descricao_imovel',
        'tipo_de_imovel'    => 'tipo_de_imovel',
        'finalidade'        => 'finalidade',
        'bairro'            => 'bairro',
        'foto_principal'    => 'foto_principal',
        'link_do_imovel'    => 'link_do_imovel',
        'link_sanitizado'   => 'link_sanitizado',
        'imagem_card'       => 'imagem_card',
        'status_publicacao' => 'status_publicacao',
        'status_operacional'=> 'status_operacional',
    );

    // Campos que ficam como string (schema text no Supabase).
    $string_count_fields = array(
        'quartos' => 'quartos',
        'suites'  => 'suites',
        'vagas'   => 'vagas',
    );

    // Campos que DEVEM ser float (422 se enviados como string nao numerica).
    $float_fields = array(
        'metragem' => 'metragem',
        'valor'    => 'valor',
    );

    $data = array();

    foreach ( $text_fields as $key => $meta_key ) {
        $val = get_post_meta( $post_id, $meta_key, true );
        $normalized = yziws_to_string_or_null( $val );
        if ( $normalized !== null ) {
            $data[ $key ] = $normalized;
        }
    }

    foreach ( $string_count_fields as $key => $meta_key ) {
        $val = get_post_meta( $post_id, $meta_key, true );
        $normalized = yziws_to_string_or_null( $val );
        if ( $normalized !== null ) {
            $data[ $key ] = $normalized;
        }
    }

    foreach ( $float_fields as $key => $meta_key ) {
        $val = get_post_meta( $post_id, $meta_key, true );
        $normalized = yziws_to_float_or_null( $val );
        if ( $normalized !== null ) {
            $data[ $key ] = $normalized;
        }
    }

    // metadata reservado para uso futuro — enviado como null apenas se houver outros campos.
    // Omitido aqui para manter payload enxuto. Endpoint aceita ausencia do campo.

    return $data;
}

/**
 * Envia um webhook para o endpoint YZI.
 * Loop guard via variavel estatica previne chamadas recursivas.
 * Falhas sao registradas em error_log; nunca propagam excecao.
 *
 * @param string     $evento    'imovel.upsert', 'imovel.unpublish' ou 'imovel.delete'.
 * @param string     $id_imovel Identificador do imovel.
 * @param array|null $data      Array de dados (apenas para imovel.upsert).
 * @return void
 */
function yziws_send_webhook( $evento, $id_imovel, $data = null ) {
    if ( ! yziws_can_send() ) {
        return;
    }

    // Loop guard: previne recursao caso um hook dispare outro save dentro do callback.
    static $in_progress = false;

    if ( $in_progress ) {
        return;
    }

    $in_progress = true;

    $body = array(
        'evento'    => $evento,
        'tenant_id' => YZIWS_TENANT_ID,
        'id_imovel' => $id_imovel,
    );

    if ( $evento === 'imovel.upsert' && is_array( $data ) ) {
        $body['data'] = $data;
    }

    $response = wp_remote_post(
        YZIWS_WEBHOOK_URL,
        array(
            'method'  => 'POST',
            'timeout' => 10,
            'blocking' => true,
            'headers' => array(
                'Authorization' => 'Bearer ' . YZIWS_WEBHOOK_SECRET,
                'Content-Type'  => 'application/json',
                'X-Source'      => 'wordpress',
            ),
            'body' => wp_json_encode( $body ),
        )
    );

    if ( is_wp_error( $response ) ) {
        error_log( 'YZIWS: WP_Error ao enviar webhook — ' . $response->get_error_message() );
    } else {
        $status_code = (int) wp_remote_retrieve_response_code( $response );

        if ( $status_code >= 400 ) {
            $body_raw  = wp_remote_retrieve_body( $response );
            $body_trunc = substr( $body_raw, 0, 500 );
            error_log( "YZIWS: HTTP {$status_code} para evento={$evento} id_imovel={$id_imovel} — {$body_trunc}" );
        }
        // Respostas 2xx sao tratadas como sucesso silencioso.
    }

    $in_progress = false;
}

/**
 * Callback para o hook 'save_post'.
 * Dispara imovel.upsert apenas quando o post esta com status 'publish'.
 * Ignora revisoes e autosaves.
 *
 * @param int     $post_id ID do post.
 * @param WP_Post $post    Objeto do post.
 * @param bool    $update  True se for atualizacao, false se for insercao.
 * @return void
 */
function yziws_on_save_post( $post_id, $post, $update ) {
    // Ignora revisoes e autosaves — nao queremos webhooks para rascunhos automaticos.
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
        return;
    }

    // Filtra apenas o CPT configurado.
    if ( $post->post_type !== yziws_get_cpt() ) {
        return;
    }

    // Apenas posts com status publish disparam upsert.
    // Mudancas de status sao tratadas por yziws_on_transition_post_status.
    if ( $post->post_status !== 'publish' ) {
        return;
    }

    $id_imovel = yziws_get_id_imovel( $post );
    $data      = yziws_build_data_payload( $post_id );

    yziws_send_webhook( 'imovel.upsert', $id_imovel, $data );
}

/**
 * Callback para o hook 'transition_post_status'.
 * Trata apenas a transicao de 'publish' para qualquer outro status (unpublish).
 * A transicao para 'publish' e coberta pelo save_post para evitar duplicidade.
 *
 * @param string  $new_status Novo status do post.
 * @param string  $old_status Status anterior do post.
 * @param WP_Post $post       Objeto do post.
 * @return void
 */
function yziws_on_transition_post_status( $new_status, $old_status, $post ) {
    // Filtra apenas o CPT configurado.
    if ( $post->post_type !== yziws_get_cpt() ) {
        return;
    }

    // Caso A: post saiu de publish → enviar unpublish.
    if ( $old_status === 'publish' && $new_status !== 'publish' ) {
        $id_imovel = yziws_get_id_imovel( $post );
        yziws_send_webhook( 'imovel.unpublish', $id_imovel );
        return;
    }

    // Caso B: post foi para publish — save_post ja dispara upsert, nao duplicar aqui.
}

/**
 * Callback para o hook 'before_delete_post'.
 * Dispara imovel.delete quando um post e deletado permanentemente.
 * NAO e disparado ao mover para Lixeira (trash) — isso cobre o transition_post_status.
 *
 * @param int $post_id ID do post a ser deletado.
 * @return void
 */
function yziws_on_before_delete_post( $post_id ) {
    $post = get_post( $post_id );

    if ( ! $post ) {
        return;
    }

    // Filtra apenas o CPT configurado.
    if ( $post->post_type !== yziws_get_cpt() ) {
        return;
    }

    $id_imovel = yziws_get_id_imovel( $post );
    yziws_send_webhook( 'imovel.delete', $id_imovel );
}

// Registra os hooks WordPress.
add_action( 'save_post',               'yziws_on_save_post',              10, 3 );
add_action( 'transition_post_status',  'yziws_on_transition_post_status', 10, 3 );
add_action( 'before_delete_post',      'yziws_on_before_delete_post',     10, 1 );
