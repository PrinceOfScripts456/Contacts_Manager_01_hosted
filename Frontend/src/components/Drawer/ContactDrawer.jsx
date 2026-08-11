import Avatar from '../Avatar/Avatar.jsx';
import {
  EditIcon, DeleteIcon, CloseIcon, PhoneIcon, EmailIcon, MsgIcon,
  BdayIcon, WebIcon, LocIcon, NoteIcon, ClockIcon,
} from '../icons.jsx';
import { fullName, gradientFor, cap, fmtDate, fmtTimestamp, getCreatedAt, getUpdatedAt, isSafeUrl } from '../../utils/helpers';
import './Drawer.css';

function buildDetails(c) {
  const details = [];
  (c.dates || []).forEach((d) => {
    if (d.date) details.push({ icon: <BdayIcon size={14} />, label: cap(d.label || 'date'), val: fmtDate(d.date) });
  });
  if (c.website) {
    details.push({
      icon: <WebIcon size={14} />, label: 'Website', val: c.website,
      href: isSafeUrl(c.website) ? c.website : undefined,
    });
  }
  if (c.address) details.push({ icon: <LocIcon size={14} />, label: 'Address', val: c.address });
  return details;
}

export default function ContactDrawer({ contact, open, onClose, onEdit, onDelete }) {
  // Keep the drawer mounted (for the closing transition) even once `contact`
  // is cleared; render nothing inside until we actually have a contact.
  if (!contact) {
    return (
      <div className={`drawer-overlay${open ? ' open' : ''}`}>
        <div className="drawer-backdrop" onClick={onClose}></div>
        <div className="drawer" role="dialog" aria-label="Contact detail"></div>
      </div>
    );
  }

  const c = contact;
  const grad = gradientFor(c);
  const phone = c.phones && c.phones[0] ? c.phones[0].number : '';
  const email = c.emails && c.emails[0] ? c.emails[0].email : '';
  const details = buildDetails(c);
  const createdAt = fmtTimestamp(getCreatedAt(c));
  const updatedAt = fmtTimestamp(getUpdatedAt(c));

  return (
    <div className={`drawer-overlay${open ? ' open' : ''}`}>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer" role="dialog" aria-label="Contact detail">
        <div className="drawer-header">
          <span className="drawer-title">Contact info</span>
          <div className="drawer-hbtns">
            <button className="icon-btn" title="Edit contact" onClick={() => onEdit(c.id)}>
              <EditIcon />
            </button>
            <button className="icon-btn" title="Delete contact" style={{ color: 'var(--danger)' }} onClick={() => onDelete(c.id)}>
              <DeleteIcon />
            </button>
            <button className="icon-btn" title="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="drawer-scroll">
          <div className="drawer-hero">
            <div className="drawer-hero-bg" style={{ background: grad }}></div>
            <Avatar contact={c} className="drawer-hero-av" />
            <div className="drawer-hero-info">
              <div className="drawer-hero-name">{fullName(c)}</div>
              <div className="drawer-hero-role">{[c.jobTitle, c.company].filter(Boolean).join(' · ')}</div>
              <div className="drawer-quick-btns">
                {phone && (
                  <button className="quick-btn" onClick={() => window.open(`tel:${phone}`)}>
                    <PhoneIcon size={13} /> Call
                  </button>
                )}
                {email && (
                  <button className="quick-btn" onClick={() => window.open(`mailto:${email}`)}>
                    <EmailIcon size={13} /> Email
                  </button>
                )}
                {phone && (
                  <button className="quick-btn" onClick={() => window.open(`sms:${phone}`)}>
                    <MsgIcon size={13} /> Message
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-body">
            {c.phones && c.phones.length > 0 && (
              <div>
                <div className="d-section-label">Phone</div>
                {c.phones.map((p, i) => (
                  <div className="d-row" key={i}>
                    <div className="d-row-icon"><PhoneIcon size={14} /></div>
                    <div className="d-row-content">
                      <div className="d-row-label">{cap(p.label || 'phone')}</div>
                      <div className="d-row-val"><a href={`tel:${p.number}`}>{p.number}</a></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {c.emails && c.emails.length > 0 && (
              <div>
                <div className="d-section-label">Email</div>
                {c.emails.map((e, i) => (
                  <div className="d-row" key={i}>
                    <div className="d-row-icon"><EmailIcon size={14} /></div>
                    <div className="d-row-content">
                      <div className="d-row-label">{cap(e.label || 'email')}</div>
                      <div className="d-row-val"><a href={`mailto:${e.email}`}>{e.email}</a></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {details.length > 0 && (
              <div>
                <div className="d-section-label">Details</div>
                {details.map((d, i) => (
                  <div className="d-row" key={i}>
                    <div className="d-row-icon">{d.icon}</div>
                    <div className="d-row-content">
                      <div className="d-row-label">{d.label}</div>
                      <div className="d-row-val">
                        {d.href ? <a href={d.href}>{d.val}</a> : d.val}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {c.note && (
              <div>
                <div className="d-section-label">Note</div>
                <div className="d-row">
                  <div className="d-row-icon"><NoteIcon size={14} /></div>
                  <div className="d-row-content">
                    <div className="d-row-val plain" style={{ paddingTop: 2 }}>{c.note}</div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="d-section-label">Timeline</div>
              <div className="d-row">
                <div className="d-row-icon"><ClockIcon size={14} /></div>
                <div className="d-row-content">
                  <div className="d-row-label">Created</div>
                  <div className={`d-row-val plain${createdAt ? '' : ' d-row-val-empty'}`}>
                    {createdAt || 'No date recorded'}
                  </div>
                </div>
              </div>
              <div className="d-row">
                <div className="d-row-icon"><ClockIcon size={14} /></div>
                <div className="d-row-content">
                  <div className="d-row-label">Last updated</div>
                  <div className={`d-row-val plain${updatedAt ? '' : ' d-row-val-empty'}`}>
                    {updatedAt || 'No date recorded'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
