<?php
/**
 * YZI OS — Webhook Imóveis
 *
 * Dispara eventos do CPT `imoveis` para POST /api/webhook/imoveis.
 * Instalar via Code Snippets (Run everywhere) ou functions.php do tema filho.
 *
 * CONFIGURAÇÃO — adicionar no wp-config.php (antes do "That's all"):
 *
 *   define( 'YZIWS_WEBHOOK_URL',    'https://plataforma.yzihub.com/api/webhook/imoveis' );
 *   define( 'YZIWS_WEBHOOK_SECRET', 'seu-secret-aqui' );
 *   define( 'YZIWS_TENANT_ID',      '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361' );
 *
 * Opcionalmente, em vez de wp-config, configure abaixo nas constantes de fallback.
 */

// ─── Configuração ─────────────────────────────────────────────────────────────

if ( ! defined( 'YZIWS_WEBHOOK_URL' ) ) {
	define( 'YZIWS_WEBHOOK_URL', '' ); // URL do endpoint Next.js
}
if ( ! defined( 'YZIWS_WEBHOOK_SECRET' ) ) {
	define( 'YZIWS_WEBHOOK_SECRET', '' ); // Bearer token — mesmo valor de WEBHOOK_IMOVEIS_SECRET
}
if ( ! defined( 'YZIWS_TENANT_ID' ) ) {
	define( 'YZIWS_TENANT_ID', '82cc7aa9-fc6e-4f37-8d8e-8a71c1691361' ); // Jurema Brokers
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Salvar / atualizar imóvel → imovel.upsert
 */
add_action( 'save_post_imoveis', 'yziws_on_save_imovel', 20, 3 );

function yziws_on_save_imovel( int $post_id, WP_Post $post, bool $update ): void {
	if ( ! yziws_is_configured() ) return;
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
	if ( wp_is_post_revision( $post_id ) ) return;
	if ( in_array( $post->post_status, [ 'auto-draft', 'trash' ], true ) ) return;

	$id_imovel = yziws_get_id_imovel( $post_id, $post );
	if ( empty( $id_imovel ) ) return;

	yziws_send_webhook( [
		'evento'    => 'imovel.upsert',
		'tenant_id' => YZIWS_TENANT_ID,
		'id_imovel' => $id_imovel,
		'data'      => yziws_build_data( $post_id, $post ),
	] );
}

/**
 * Mover para lixeira → imovel.unpublish
 */
add_action( 'trash_post', 'yziws_on_trash_imovel', 10, 1 );

function yziws_on_trash_imovel( int $post_id ): void {
	if ( get_post_type( $post_id ) !== 'imoveis' ) return;
	if ( ! yziws_is_configured() ) return;

	$post      = get_post( $post_id );
	$id_imovel = yziws_get_id_imovel( $post_id, $post );
	if ( empty( $id_imovel ) ) return;

	yziws_send_webhook( [
		'evento'    => 'imovel.unpublish',
		'tenant_id' => YZIWS_TENANT_ID,
		'id_imovel' => $id_imovel,
	] );
}

/**
 * Deletar permanente → imovel.delete
 */
add_action( 'before_delete_post', 'yziws_on_delete_imovel', 10, 1 );

function yziws_on_delete_imovel( int $post_id ): void {
	if ( get_post_type( $post_id ) !== 'imoveis' ) return;
	if ( ! yziws_is_configured() ) return;

	$post      = get_post( $post_id );
	$id_imovel = yziws_get_id_imovel( $post_id, $post );
	if ( empty( $id_imovel ) ) return;

	yziws_send_webhook( [
		'evento'    => 'imovel.delete',
		'tenant_id' => YZIWS_TENANT_ID,
		'id_imovel' => $id_imovel,
	] );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yziws_is_configured(): bool {
	return ! empty( YZIWS_WEBHOOK_URL ) && ! empty( YZIWS_WEBHOOK_SECRET );
}

/**
 * Resolve o id_imovel do post.
 * Prioridade: meta `codigo-do-imovel` (campo JetEngine real no REST)
 *           → meta `id_imovel` → meta `_id_imovel` → post_name (slug).
 */
function yziws_get_id_imovel( int $post_id, WP_Post $post ): string {
	$id = get_post_meta( $post_id, 'codigo-do-imovel', true );
	if ( empty( $id ) ) {
		$id = get_post_meta( $post_id, 'id_imovel', true );
	}
	if ( empty( $id ) ) {
		$id = get_post_meta( $post_id, '_id_imovel', true );
	}
	if ( empty( $id ) ) {
		$id = $post->post_name;
	}
	return sanitize_text_field( (string) $id );
}

/**
 * Retorna o nome do primeiro termo de uma taxonomia, ou null.
 */
function yziws_get_term( int $post_id, string $taxonomy ): ?string {
	$terms = get_the_terms( $post_id, $taxonomy );
	if ( ! $terms || is_wp_error( $terms ) ) return null;
	return $terms[0]->name;
}

/**
 * Resolve foto_principal: thumbnail → meta foto_principal (ACF image ou URL).
 */
function yziws_get_foto_principal( int $post_id ): ?string {
	$thumb_id = get_post_thumbnail_id( $post_id );
	if ( $thumb_id ) {
		$url = wp_get_attachment_url( $thumb_id );
		if ( $url ) return $url;
	}

	$meta = get_post_meta( $post_id, 'foto_principal', true );
	if ( ! empty( $meta ) ) {
		if ( is_array( $meta ) && ! empty( $meta['url'] ) ) return $meta['url'];
		if ( is_string( $meta ) ) return $meta;
	}

	return null;
}

/**
 * Constrói o objeto data para imovel.upsert.
 * Campos ausentes/vazios são omitidos (merge parcial no endpoint).
 * valor e metragem são enviados como float (endpoint rejeita string numérica).
 */
function yziws_build_data( int $post_id, WP_Post $post ): array {
	$m = static function ( string $key ) use ( $post_id ): mixed {
		$v = get_post_meta( $post_id, $key, true );
		return ( $v !== false && $v !== '' ) ? $v : null;
	};

	// Taxonomias (slug com hífen como WordPress registra, com fallback para underscore)
	$bairro         = yziws_get_term( $post_id, 'bairro' )
	                ?? yziws_get_term( $post_id, 'bairro_imovel' )
	                ?? $m( 'bairro' );
	$tipo_de_imovel = yziws_get_term( $post_id, 'tipo-de-imovel' )
	                ?? yziws_get_term( $post_id, 'tipo_de_imovel' )
	                ?? $m( 'tipo_de_imovel' );
	$finalidade     = yziws_get_term( $post_id, 'finalidade' )
	                ?? $m( 'finalidade' );

	// Numéricos — endpoint valida que valor/metragem sejam number, não string
	$valor_raw    = $m( 'valor' );
	$metragem_raw = $m( 'metragem' );
	$valor        = $valor_raw !== null ? (float) $valor_raw : null;
	$metragem     = $metragem_raw !== null ? (float) $metragem_raw : null;

	// Status publicação baseado no post_status
	$status_publicacao = $post->post_status === 'publish' ? 'Publicado' : 'Rascunho';

	$candidates = [
		'titulo_comercial'   => $post->post_title ?: $m( 'titulo_comercial' ),
		'titulo_seo'         => $m( 'titulo_seo' ),
		'descricao_imovel'   => $post->post_content ?: $m( 'descricao_imovel' ),
		'tipo_de_imovel'     => $tipo_de_imovel,
		'finalidade'         => $finalidade,
		'bairro'             => $bairro,
		'quartos'            => $m( 'quartos' ),
		'suites'             => $m( 'suites' ),
		'vagas'              => $m( 'vagas' ),
		'metragem'           => $metragem,
		'valor'              => $valor,
		'foto_principal'     => yziws_get_foto_principal( $post_id ),
		'link_do_imovel'     => $m( 'link_do_imovel' ) ?: get_permalink( $post_id ),
		'imagem_card'        => $m( 'imagem_card' ),
		'status_publicacao'  => $status_publicacao,
		'status_operacional' => $m( 'status_operacional' ) ?: 'disponivel',
	];

	// Remove null/'' mas preserva 0 e 0.0 (valores numéricos válidos)
	return array_filter( $candidates, static fn( $v ) => $v !== null && $v !== '' );
}

/**
 * Envia o payload para o webhook via wp_remote_post.
 * Erros HTTP e de rede são registrados em error_log.
 */
function yziws_send_webhook( array $payload ): void {
	$body = wp_json_encode( $payload );

	$response = wp_remote_post( YZIWS_WEBHOOK_URL, [
		'timeout'     => 10,
		'headers'     => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . YZIWS_WEBHOOK_SECRET,
			'X-Source'      => 'wordpress',
		],
		'body'        => $body,
		'data_format' => 'body',
	] );

	if ( is_wp_error( $response ) ) {
		error_log( '[yziws] Webhook falhou: ' . $response->get_error_message() . ' | ' . $body );
		return;
	}

	$code = wp_remote_retrieve_response_code( $response );
	if ( $code < 200 || $code >= 300 ) {
		$resp = wp_remote_retrieve_body( $response );
		error_log( "[yziws] Webhook HTTP {$code}: {$resp} | {$body}" );
	}
}
